// Synthetic analytics data for the management dashboard.

export interface AgentStat {
  name: string;
  conversion_pct: number;
  calls_today: number;
  avg_call_min: number;
  script_adherence_pct: number;
}

export interface ProductStat {
  product: string;
  conversion_pct: number;
  calls: number;
  avg_deal_uzs: number;
}

export interface ObjectionStat {
  objection: string;
  count: number;
  resolved_pct: number;
}

export const ANALYTICS = {
  today: {
    total_calls: 247,
    total_calls_yesterday: 218,
    conversion_pct: 41,
    conversion_pct_yesterday: 36,
    pipeline_uzs: 2_412_500_000,
    pipeline_uzs_yesterday: 1_890_000_000,
    avg_call_sec: 412,
    avg_call_sec_yesterday: 458,
    avg_compliance_pct: 91,
    avg_compliance_pct_yesterday: 87,
    nps: 47,
    nps_yesterday: 42,
  },
  conversion_30d: [
    34, 36, 35, 37, 39, 33, 31, 32, 35, 38, 40, 41, 38, 36, 38,
    41, 43, 42, 39, 37, 38, 40, 43, 45, 42, 40, 39, 38, 41, 41,
  ],
  compliance_30d: [
    82, 81, 83, 85, 86, 84, 82, 83, 85, 86, 87, 86, 85, 87, 89,
    90, 89, 88, 89, 90, 91, 90, 89, 91, 92, 91, 90, 89, 91, 91,
  ],
  call_volume_30d: [
    178, 192, 184, 201, 215, 168, 142, 195, 211, 223, 240, 232, 210, 198, 215,
    228, 241, 235, 220, 205, 215, 230, 244, 260, 248, 235, 220, 218, 247, 247,
  ],
  agents_top: [
    { name: "Diyora Hasanova",  conversion_pct: 58, calls_today: 41, avg_call_min: 6.4, script_adherence_pct: 96 },
    { name: "Murod Tursunov",   conversion_pct: 52, calls_today: 38, avg_call_min: 7.1, script_adherence_pct: 94 },
    { name: "Sardor Yusupov",   conversion_pct: 49, calls_today: 35, avg_call_min: 6.8, script_adherence_pct: 92 },
    { name: "Nigora Mansurova", conversion_pct: 46, calls_today: 33, avg_call_min: 7.5, script_adherence_pct: 89 },
    { name: "Aziza Karimova",   conversion_pct: 44, calls_today: 31, avg_call_min: 7.2, script_adherence_pct: 91 },
  ] as AgentStat[],
  products_top: [
    { product: "KAPITAL IPOTEKA",         conversion_pct: 34, calls: 89, avg_deal_uzs: 145_000_000 },
    { product: "Yangi uyga ipoteka",      conversion_pct: 29, calls: 64, avg_deal_uzs: 110_000_000 },
    { product: "Sarmoya deposit",         conversion_pct: 51, calls: 52, avg_deal_uzs:  18_500_000 },
    { product: "Visa Platinum",           conversion_pct: 42, calls: 71, avg_deal_uzs:   1_200_000 },
    { product: "Auto loan (Chevrolet)",   conversion_pct: 38, calls: 44, avg_deal_uzs:  85_000_000 },
  ] as ProductStat[],
  objections_missed: [
    { objection: "Comparison with Kapital Bank", count: 14, resolved_pct: 36 },
    { objection: "“I'll think about it”",        count: 12, resolved_pct: 41 },
    { objection: "Interest rate too high",       count:  9, resolved_pct: 67 },
    { objection: "“My family decides”",          count:  7, resolved_pct: 28 },
    { objection: "Wrong moment / busy",          count:  5, resolved_pct: 60 },
  ] as ObjectionStat[],
  compliance_breakdown: [
    { item: "Source of income asked",            pct: 96 },
    { item: "Interest rate disclosed",           pct: 94 },
    { item: "Data-processing consent obtained",  pct: 92 },
    { item: "Cooling-off period mentioned",      pct: 87 },
    { item: "Purpose of call explained",         pct: 99 },
    { item: "Customer's full name confirmed",    pct: 98 },
    { item: "Callback phone verified",           pct: 91 },
    { item: "No 'guaranteed' / illegal promises", pct: 98 },
  ],
};
