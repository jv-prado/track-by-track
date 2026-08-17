import { Inject, Injectable } from '@nestjs/common';
import {
  BILLBOARD_HTTP_CLIENT,
  type BillboardHttpClient,
} from './billboard-http-client';
import { parseBillboardDate } from './billboard-date';

/**
 * Fonte pública, sem auth, do billboard-json (ver spec §3). Só o Billboard 200
 * por enquanto — os outros charts do projeto (`Top Album Sales`, `Global 200`,
 * `Official UK Albums`) usam o mesmo domínio, quando forem adicionados basta
 * um método novo aqui, sem mexer no resolver nem no sync.
 */
const BILLBOARD_200_URL =
  'https://raw.githubusercontent.com/KoreanThinker/billboard-json/main/billboard-200/recent.json';

interface BillboardRawItem {
  name: string;
  artist: string;
  image?: string;
  rank: number;
  last_week_rank?: number | null;
  peak_rank?: number;
  weeks_on_chart?: number;
}

interface BillboardRawResponse {
  date: string;
  data: BillboardRawItem[];
}

export interface BillboardChartItem {
  name: string;
  artist: string;
  imageUrl?: string;
  rank: number;
  lastWeekRank?: number;
  peakRank?: number;
  weeksOnChart?: number;
}

export interface BillboardChartSnapshot {
  chartDate: Date;
  items: BillboardChartItem[];
}

@Injectable()
export class BillboardSourceService {
  constructor(
    @Inject(BILLBOARD_HTTP_CLIENT)
    private readonly http: BillboardHttpClient,
  ) {}

  async fetchBillboard200(): Promise<BillboardChartSnapshot> {
    const response =
      await this.http.get<BillboardRawResponse>(BILLBOARD_200_URL);
    const raw = response.data;

    return {
      chartDate: parseBillboardDate(raw.date),
      items: raw.data.map((item) => ({
        name: item.name,
        artist: item.artist,
        imageUrl: item.image || undefined,
        rank: item.rank,
        lastWeekRank: item.last_week_rank ?? undefined,
        // Checado contra o JSON real (17/ago/2026, 200 itens): `peak_rank`
        // vem `0` em 100% das entradas, nunca um valor real — bug conhecido
        // da fonte, não falta de dado pontual. `0` não é posição válida de
        // chart (rank começa em 1), então normaliza pra "não informado" aqui;
        // o histórico (charts.service.ts) cai pro próprio `rank` observado
        // como melhor peak conhecido até termos semanas suficientes.
        peakRank: item.peak_rank || undefined,
        weeksOnChart: item.weeks_on_chart,
      })),
    };
  }
}
