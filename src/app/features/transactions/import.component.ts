import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { StoreService } from '../../core/store.service';
import { ToastService } from '../../core/toast.service';
import { CsvMapping, guessMapping, mapRows, parseCsv } from '../../shared/csv';
import { PIPES } from '../../shared/pipes';

@Component({
  selector: 'app-import',
  imports: [FormsModule, ...PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!result()) {
      <div class="form">
        <p class="small soft">Exportez le relevé depuis votre banque au format CSV (BoursoBank, Crédit Agricole, BNP, Société Générale, Revolut, N26, Qonto…). Les doublons sont ignorés et les catégories attribuées par vos règles.</p>
        <div class="row">
          <label class="field"><span>Compte de destination</span>
            <select [(ngModel)]="accountId" name="acc">
              @for (a of store.activeAccounts(); track a.id) { <option [ngValue]="a.id">{{ a.name }}</option> }
            </select>
          </label>
          <label class="field"><span>Fichier CSV</span><input type="file" accept=".csv,.txt,text/csv" (change)="onFile($event)" /></label>
        </div>

        @if (rows().length) {
          <div class="row three">
            <label class="field"><span>Colonne date</span>
              <select [ngModel]="map().date" (ngModelChange)="setMap({ date: +$event })" name="cd">
                @for (h of header(); track $index) { <option [ngValue]="$index">{{ h || 'Colonne ' + ($index + 1) }}</option> }
              </select>
            </label>
            <label class="field"><span>Colonne libellé</span>
              <select [ngModel]="map().description" (ngModelChange)="setMap({ description: +$event })" name="cl">
                @for (h of header(); track $index) { <option [ngValue]="$index">{{ h || 'Colonne ' + ($index + 1) }}</option> }
              </select>
            </label>
            <label class="field"><span>Colonne montant (signé)</span>
              <select [ngModel]="map().amount" (ngModelChange)="setMap({ amount: $event })" name="ca">
                <option [ngValue]="null">— Débit / crédit séparés —</option>
                @for (h of header(); track $index) { <option [ngValue]="$index">{{ h || 'Colonne ' + ($index + 1) }}</option> }
              </select>
            </label>
          </div>
          @if (map().amount === null) {
            <div class="row">
              <label class="field"><span>Colonne débit</span>
                <select [ngModel]="map().debit" (ngModelChange)="setMap({ debit: $event })" name="cdb">
                  <option [ngValue]="null">—</option>
                  @for (h of header(); track $index) { <option [ngValue]="$index">{{ h || 'Colonne ' + ($index + 1) }}</option> }
                </select>
              </label>
              <label class="field"><span>Colonne crédit</span>
                <select [ngModel]="map().credit" (ngModelChange)="setMap({ credit: $event })" name="ccr">
                  <option [ngValue]="null">—</option>
                  @for (h of header(); track $index) { <option [ngValue]="$index">{{ h || 'Colonne ' + ($index + 1) }}</option> }
                </select>
              </label>
            </div>
          }
          <div class="toolbar">
            <label class="check"><input type="checkbox" [ngModel]="hasHeader()" (ngModelChange)="hasHeader.set($event)" name="hh" /> La première ligne est un en-tête</label>
            <label class="check"><input type="checkbox" [ngModel]="map().invert" (ngModelChange)="setMap({ invert: $event })" name="inv" /> Inverser le signe</label>
          </div>
          <div class="table-wrap">
            <table class="ledger-table">
              <thead><tr><th>Date</th><th>Libellé</th><th class="num">Montant</th></tr></thead>
              <tbody>
                @for (r of preview().ok.slice(0, 8); track $index) {
                  <tr><td class="nowrap">{{ r.date | frDate }}</td><td class="ellipsis" style="max-width: 360px">{{ r.description }}</td><td class="num" [class]="r.amount | sign">{{ r.amount | money: 'signed' }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="small">
            <strong>{{ preview().ok.length }}</strong> ligne(s) prêtes
            @if (preview().errors) { · <span class="debit">{{ preview().errors }} ignorée(s) (date ou montant illisible)</span> }
          </p>
        }
        <div class="form-actions">
          <button class="btn" type="button" (click)="closed.emit()">Annuler</button>
          <button class="btn primary" type="button" [disabled]="!preview().ok.length || !accountId || busy()" (click)="send()">Importer {{ preview().ok.length || '' }} opération(s)</button>
        </div>
      </div>
    } @else {
      <div class="form">
        <div class="notice good">{{ result()!.created }} opération(s) importée(s), {{ result()!.categorized }} catégorisée(s) automatiquement, {{ result()!.skipped }} doublon(s) ou ligne(s) vide(s) ignorée(s).</div>
        <div class="form-actions"><button class="btn primary" type="button" (click)="done.emit()">Voir les opérations</button></div>
      </div>
    }
  `,
})
export class ImportComponent {
  store = inject(StoreService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  closed = output<void>();
  done = output<void>();

  accountId: number | null = this.store.activeAccounts().find((a) => a.type === 'checking')?.id ?? this.store.activeAccounts()[0]?.id ?? null;
  rows = signal<string[][]>([]);
  hasHeader = signal(true);
  map = signal<CsvMapping>({ date: 0, description: 1, amount: 2, debit: null, credit: null, invert: false });
  busy = signal(false);
  result = signal<{ created: number; skipped: number; categorized: number } | null>(null);

  header = computed(() => {
    const r = this.rows();
    if (!r.length) return [];
    return this.hasHeader() ? r[0] : r[0].map((_, i) => `Colonne ${i + 1}`);
  });
  preview = computed(() => mapRows(this.rows(), this.map(), this.hasHeader()));

  setMap(p: Partial<CsvMapping>): void {
    this.map.update((m) => ({ ...m, ...p }));
  }

  onFile(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let text = String(reader.result ?? '');
      // Repli Windows-1252 si l'UTF-8 a produit des caractères de remplacement
      if (text.includes('�')) {
        const r2 = new FileReader();
        r2.onload = () => this.ingest(String(r2.result ?? ''));
        r2.readAsText(file, 'windows-1252');
        return;
      }
      this.ingest(text);
    };
    reader.readAsText(file, 'utf-8');
  }

  private ingest(text: string): void {
    const rows = parseCsv(text);
    // Ignore les lignes d'en-tête de banque avant le vrai tableau (ex. « Compte n°… »)
    const width = Math.max(...rows.map((r) => r.length));
    const start = rows.findIndex((r) => r.length >= Math.min(3, width));
    const clean = rows.slice(Math.max(0, start));
    this.rows.set(clean);
    if (clean.length) this.map.set(guessMapping(clean[0]));
  }

  send(): void {
    if (!this.accountId) return;
    this.busy.set(true);
    this.api.post<{ created: number; skipped: number; categorized: number }>('transactions/import', { account_id: this.accountId, rows: this.preview().ok }).subscribe({
      next: (r) => {
        this.result.set(r);
        this.store.changed();
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.error(e, "L'import a échoué.");
      },
    });
  }
}
