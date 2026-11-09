import { ConfirmService } from '../../core/confirm.service';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ASSET_CLASSES } from '../../core/labels';
import { Asset, AssetSearchResult } from '../../core/models';
import { ToastService } from '../../core/toast.service';

type AssetDraft = Omit<Asset, 'id' | 'fx_rate' | 'price_updated_at' | 'operations_count'> & { id?: number };

@Component({
  selector: 'app-asset-form',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="form" (ngSubmit)="save()">
      @if (!asset()) {
        <label class="field"><span>Rechercher un instrument</span>
          <input type="search" name="q" placeholder="ex. MSCI World, CW8, Apple, bitcoin, LU1681043599" [ngModel]="q()" (ngModelChange)="search($event)" autocomplete="off" />
          <small>Cotations Yahoo Finance (actions, ETF) et CoinGecko (crypto). Sinon, saisissez l'actif à la main ci-dessous.</small>
        </label>
        @if (results().length) {
          <div class="results">
            @for (r of results(); track r.source_id + r.price_source) {
              <button type="button" class="result" (click)="pick(r)">
                <strong class="mono">{{ r.symbol }}</strong>
                <span class="ellipsis">{{ r.name }}</span>
                <span class="tag">{{ classLabel(r.asset_class) }} · {{ r.exchange }}</span>
              </button>
            }
          </div>
        }
      }
      <div class="row three">
        <label class="field"><span>Symbole</span><input name="symbol" required [ngModel]="d().symbol" (ngModelChange)="patch({ symbol: $event })" /></label>
        <label class="field" style="grid-column: span 2"><span>Nom</span><input name="name" required [ngModel]="d().name" (ngModelChange)="patch({ name: $event })" /></label>
      </div>
      <div class="row three">
        <label class="field"><span>Classe</span>
          <select name="class" [ngModel]="d().asset_class" (ngModelChange)="patch({ asset_class: $event })">
            @for (c of classes; track c.key) { <option [value]="c.key">{{ c.label }}</option> }
          </select>
        </label>
        <label class="field"><span>Devise de cotation</span><input name="cur" maxlength="3" [ngModel]="d().currency" (ngModelChange)="patch({ currency: ($event || '').toUpperCase() })" /></label>
        <label class="field"><span>ISIN</span><input name="isin" maxlength="12" [ngModel]="d().isin" (ngModelChange)="patch({ isin: $event })" /></label>
      </div>
      <div class="row three">
        <label class="field"><span>Source des cours</span>
          <select name="src" [ngModel]="d().price_source" (ngModelChange)="patch({ price_source: $event })">
            <option value="manual">Manuelle</option>
            <option value="yahoo">Yahoo Finance</option>
            <option value="coingecko">CoinGecko</option>
          </select>
        </label>
        <label class="field"><span>Identifiant source</span><input name="sid" [ngModel]="d().source_id" (ngModelChange)="patch({ source_id: $event })" placeholder="CW8.PA, bitcoin" /></label>
        <label class="field"><span>Cours actuel</span><input type="number" step="any" min="0" name="price" [ngModel]="d().current_price" (ngModelChange)="patch({ current_price: $event })" /></label>
      </div>
      <div class="row">
        <label class="field"><span>Zone géographique</span><input name="region" list="regions" [ngModel]="d().region" (ngModelChange)="patch({ region: $event })" /></label>
        <label class="field"><span>Secteur</span><input name="sector" [ngModel]="d().sector" (ngModelChange)="patch({ sector: $event })" placeholder="Diversifié, Technologie…" /></label>
      </div>
      <datalist id="regions"><option value="Monde"></option><option value="États-Unis"></option><option value="Europe"></option><option value="France"></option><option value="Émergents"></option><option value="Asie"></option></datalist>
      <label class="check"><input type="checkbox" name="pea" [ngModel]="d().pea_eligible" (ngModelChange)="patch({ pea_eligible: $event })" /> Éligible PEA</label>
      <div class="form-actions">
        @if (asset()) { <button type="button" class="btn danger" (click)="remove()">Supprimer</button> }
        <span class="spacer"></span>
        <button type="button" class="btn" (click)="closed.emit()">Annuler</button>
        <button type="submit" class="btn primary" [disabled]="busy()">Enregistrer</button>
      </div>
    </form>
  `,
  styles: [`.results{display:grid;border:1px solid var(--rule);border-radius:3px;max-height:240px;overflow:auto}
    .result{display:grid;grid-template-columns:90px 1fr auto;gap:10px;align-items:center;text-align:left;padding:8px 10px;border:0;border-bottom:1px solid var(--rule);background:var(--sheet);color:var(--ink);font:inherit;cursor:pointer;min-width:0}
    .result:hover{background:var(--sheet-2)}`],
})
export class AssetFormComponent implements OnInit {
  asset = input<Asset | null>(null);
  saved = output<Asset>();
  closed = output<void>();
  private api = inject(ApiService);
  private confirmDialog = inject(ConfirmService);
  private toast = inject(ToastService);
  classes = Object.entries(ASSET_CLASSES).filter(([k]) => !['cash', 'real_estate'].includes(k)).map(([key, v]) => ({ key, label: v.label }));
  q = signal('');
  results = signal<AssetSearchResult[]>([]);
  busy = signal(false);
  d = signal<AssetDraft>({ symbol: '', name: '', asset_class: 'etf', isin: null, currency: 'EUR', price_source: 'manual', source_id: null, current_price: 0, region: null, sector: null, pea_eligible: false });
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const a = this.asset();
    if (a) this.d.set({ ...a });
  }

  classLabel(k: string): string {
    return ASSET_CLASSES[k]?.label ?? k;
  }

  patch(p: Partial<AssetDraft>): void {
    this.d.update((x) => ({ ...x, ...p }));
  }

  search(q: string): void {
    this.q.set(q);
    clearTimeout(this.timer);
    if (q.trim().length < 2) {
      this.results.set([]);
      return;
    }
    this.timer = setTimeout(() => this.api.get<AssetSearchResult[]>('assets/search', { q }).subscribe((r) => this.results.set(r)), 350);
  }

  pick(r: AssetSearchResult): void {
    const symbol = r.price_source === 'yahoo' ? r.symbol.split('.')[0] : r.symbol;
    const paris = r.symbol.endsWith('.PA');
    this.patch({ symbol, name: r.name, asset_class: r.asset_class === 'other' ? 'stock' : r.asset_class, price_source: r.price_source, source_id: r.source_id, currency: r.price_source === 'coingecko' || paris || /\.(AS|DE|MI|MC|BR)$/.test(r.symbol) ? 'EUR' : r.symbol.includes('.') ? this.d().currency : 'USD' });
    this.results.set([]);
  }

  save(): void {
    this.busy.set(true);
    const a = this.asset();
    const req = a ? this.api.put<Asset>(`assets/${a.id}`, this.d()) : this.api.post<Asset>('assets', this.d());
    req.subscribe({
      next: (res) => {
        this.toast.show(a ? 'Actif mis à jour.' : 'Actif ajouté.');
        this.saved.emit(res);
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e);
      },
    });
  }

  async remove(): Promise<void> {
    const a = this.asset();
    if (!a || !(await this.confirmDialog.ask(`Supprimer ${a.symbol} et toutes ses opérations ?`))) return;
    this.api.delete(`assets/${a.id}`).subscribe({ next: () => this.saved.emit(a), error: (e) => this.toast.error(e) });
  }
}
