/**
 * The 79-indicator table, ported verbatim from the prototype.
 *
 * p: parameter | w: weight within parameter (%) | min/max: peer band floor & ceiling
 * perK: floor/ceiling expressed per 1,000 students | inv: lower is better
 * pace: normalised points per year closable at steady push (before PACE_K)
 * lag: years before improvement registers | eff: effort 1 low, 2 medium, 3 high
 * der: formula text for derived indicators (never entered, always computed)
 *
 * Do not change any weight, floor, ceiling, pace or lag here.
 */

export type IndicatorId =
  "X1" | "X2" | "X3" | "X4" | "X5" | "X6" | "X7" | "X8" | "X9" | "X10" | "X11" | "X12" | "X13" | "X14" | "X15" | "X16" | "X17" | "X18" | "X19" | "X20" | "X21" | "X22" | "X23" | "X24" | "X25" | "X26" | "X27" | "X28" | "X29" | "X30" | "X31" | "X32" | "X33" | "X34" | "X35" | "X36" | "X37" | "X38" | "X39" | "X40" | "X41" | "X42" | "X43" | "X44" | "X45" | "X46" | "X47" | "X48" | "X49" | "X50" | "X51" | "X52" | "X53" | "X54" | "X55" | "X56" | "X57" | "X58" | "X59" | "X60" | "X61" | "X62" | "X63" | "X64" | "X65" | "X66" | "X67" | "X68" | "X69" | "X70" | "X71" | "X72" | "X73" | "X74" | "X75" | "X76" | "X77" | "X78" | "X79";

export type Param = "TLR" | "RP" | "GO" | "OI" | "PR";

export type Indicator = {
  id: IndicatorId;
  p: Param;
  w: number;
  nm: string;
  u: string;
  min: number;
  max: number;
  perK?: 1;
  inv?: 1;
  der?: string;
  pace: number;
  lag: number;
  eff: 1 | 2 | 3;
  act: string;
  sel?: "accred";
};

export const IND: readonly Indicator[] = [
// --- TLR (15) ---
{id:"X1", p:"TLR",w:5, nm:"Total student strength",u:"students",min:1000,max:15000,pace:3.0,lag:0,eff:2,act:"Grow enrolment through new programmes and better admissions conversion"},
{id:"X2", p:"TLR",w:8, nm:"Total faculty strength",u:"faculty",min:15,max:100,perK:1,pace:4.5,lag:0,eff:3,act:"Recruit teaching faculty across departments"},
{id:"X3", p:"TLR",w:10,nm:"Permanent faculty",u:"faculty",min:10,max:90,perK:1,pace:4.0,lag:0,eff:3,act:"Convert contractual posts to regular appointments and fill sanctioned vacancies"},
{id:"X4", p:"TLR",w:10,nm:"PhD-qualified faculty",u:"faculty",min:5,max:80,perK:1,pace:4.5,lag:0,eff:3,act:"Hire doctorate holders and fund PhD completion for serving faculty"},
{id:"X5", p:"TLR",w:15,nm:"Students per faculty member",u:"1:N",min:8,max:40,inv:1,der:"X1 \u00f7 X2",pace:0,lag:0,eff:3,act:"Falls as faculty hiring outpaces intake growth"},
{id:"X6", p:"TLR",w:8, nm:"Faculty with 10+ years experience",u:"faculty",min:5,max:45,perK:1,pace:2.0,lag:1,eff:3,act:"Retain senior faculty and recruit mid-career academics"},
{id:"X7", p:"TLR",w:5, nm:"Total academic programmes",u:"programmes",min:10,max:80,pace:5.0,lag:0,eff:2,act:"Launch programmes where faculty depth already exists"},
{id:"X8", p:"TLR",w:8, nm:"Annual recurring expenditure",u:"\u20b9 crore",min:4,max:60,perK:1,pace:4.0,lag:0,eff:3,act:"Raise the operating budget per student"},
{id:"X9", p:"TLR",w:5, nm:"Capital expenditure",u:"\u20b9 crore",min:1,max:25,perK:1,pace:6.0,lag:0,eff:3,act:"Commit a multi-year capital plan for buildings and major equipment"},
{id:"X10",p:"TLR",w:8, nm:"Expenditure per student",u:"\u20b9 lakh",min:0.5,max:6,der:"(X8 + X9) \u00f7 X1",pace:0,lag:0,eff:3,act:"Follows total spend against enrolment"},
{id:"X11",p:"TLR",w:5, nm:"Laboratory and learning-resource spend",u:"\u20b9 crore",min:0.1,max:6,perK:1,pace:7.0,lag:0,eff:2,act:"Ring-fence a lab equipment and consumables budget"},
{id:"X12",p:"TLR",w:4, nm:"Library and digital resources",u:"'000 titles",min:4,max:250,pace:11,lag:0,eff:1,act:"Join major e-resource consortia and widen database access"},
{id:"X13",p:"TLR",w:4, nm:"Number of laboratories",u:"labs",min:1.5,max:20,perK:1,pace:6.0,lag:0,eff:2,act:"Commission additional teaching and research labs"},
{id:"X14",p:"TLR",w:2, nm:"Sanctioned intake capacity",u:"seats/yr",min:300,max:5000,pace:4.0,lag:0,eff:2,act:"Seek regulatory approval for higher sanctioned intake"},
{id:"X15",p:"TLR",w:3, nm:"Accreditation and quality grade",u:"index 0\u2013100",min:0,max:100,pace:2.2,lag:1,eff:3,sel:"accred",act:"Move up the NAAC grade and add NBA programme accreditations"},
// --- RP (22) ---
{id:"X16",p:"RP",w:5, nm:"Total research publications",u:"papers/yr",min:5,max:300,perK:1,pace:8.0,lag:0,eff:2,act:"Set departmental publication targets and review them at appraisal"},
{id:"X17",p:"RP",w:3, nm:"Scopus-indexed publications",u:"papers/yr",min:2,max:240,perK:1,pace:8.0,lag:0,eff:2,act:"Steer submissions to indexed venues and drop predatory outlets"},
{id:"X18",p:"RP",w:3, nm:"WoS / SCI / SCIE publications",u:"papers/yr",min:1,max:180,perK:1,pace:6.5,lag:0,eff:2,act:"Target SCIE-listed journals in the strongest departments"},
{id:"X19",p:"RP",w:7, nm:"Q1 / Q2 publications",u:"papers/yr",min:0.4,max:120,perK:1,pace:5.0,lag:1,eff:3,act:"Run a quartile-first policy with internal review before submission"},
{id:"X20",p:"RP",w:6, nm:"Total citations",u:"citations",min:10,max:3000,perK:1,pace:4.0,lag:2,eff:2,act:"Build the citation base through open access and visible co-authorship"},
{id:"X21",p:"RP",w:6, nm:"Citations per publication",u:"ratio",min:0.3,max:20,der:"X20 \u00f7 X16",pace:0,lag:2,eff:3,act:"Rises only if citations grow faster than output"},
{id:"X22",p:"RP",w:7, nm:"Institutional h-index",u:"index",min:3,max:90,pace:2.0,lag:2,eff:3,act:"Sustain quality output \u2014 moves only on multi-year consistency"},
{id:"X23",p:"RP",w:3, nm:"Patents filed",u:"filings/yr",min:0.05,max:15,perK:1,pace:11,lag:0,eff:1,act:"Run an IPR cell with drafting support and filing fees covered"},
{id:"X24",p:"RP",w:6, nm:"Patents granted",u:"grants",min:0.1,max:6,perK:1,pace:3.5,lag:2,eff:2,act:"Prosecute filings to grant \u2014 budget for examination responses"},
{id:"X25",p:"RP",w:2, nm:"Copyrights, designs and other IPR",u:"registrations",min:0.2,max:8,perK:1,pace:13,lag:0,eff:1,act:"Register software, design and creative outputs already produced"},
{id:"X26",p:"RP",w:4, nm:"Sponsored research projects",u:"projects",min:0.2,max:20,perK:1,pace:6.0,lag:1,eff:2,act:"Set a proposal submission quota with pre-award support"},
{id:"X27",p:"RP",w:7, nm:"Sponsored research funding",u:"\u20b9 crore",min:0.1,max:20,perK:1,pace:5.0,lag:1,eff:3,act:"Pursue larger multi-investigator grants, not only small individual ones"},
{id:"X28",p:"RP",w:2, nm:"Consultancy projects",u:"projects",min:0.05,max:10,perK:1,pace:9.0,lag:0,eff:1,act:"Formalise consultancy through an institutional route with revenue sharing"},
{id:"X29",p:"RP",w:4, nm:"Consultancy income",u:"\u20b9 crore",min:0.01,max:4,perK:1,pace:7.0,lag:1,eff:2,act:"Package testing, advisory and training services for industry"},
{id:"X30",p:"RP",w:3, nm:"PhD scholars enrolled",u:"scholars",min:1,max:80,perK:1,pace:7.0,lag:0,eff:2,act:"Expand funded fellowships and recognised supervisor capacity"},
{id:"X31",p:"RP",w:6, nm:"PhD graduates",u:"awards/yr",min:0.2,max:20,perK:1,pace:3.0,lag:3,eff:2,act:"Clear the thesis pipeline \u2014 enrolment three years ago sets this year's number"},
{id:"X32",p:"RP",w:4, nm:"International collaborations",u:"active",min:0,max:60,pace:9.0,lag:1,eff:2,act:"Convert MoUs into co-authored output and joint proposals"},
{id:"X33",p:"RP",w:4, nm:"Industry collaborations",u:"active",min:0,max:80,pace:9.5,lag:0,eff:2,act:"Sign working R&D agreements with named deliverables"},
{id:"X34",p:"RP",w:5, nm:"Research expenditure",u:"\u20b9 crore",min:0.05,max:15,perK:1,pace:5.5,lag:0,eff:3,act:"Allocate an internal research fund independent of external grants"},
{id:"X35",p:"RP",w:3, nm:"Research awards",u:"awards",min:0,max:40,pace:4.0,lag:1,eff:2,act:"Nominate faculty systematically for national fellowships and awards"},
{id:"X36",p:"RP",w:3, nm:"Technology transfer and commercialisation",u:"outcomes",min:0,max:20,pace:2.5,lag:2,eff:3,act:"Set up a technology transfer office with licensing capability"},
{id:"X37",p:"RP",w:7, nm:"High-impact publications",u:"papers",min:0.2,max:80,perK:1,pace:3.5,lag:1,eff:3,act:"Fund a small number of flagship research groups properly"},
// --- GO (15) ---
{id:"X38",p:"GO",w:4, nm:"Graduating students",u:"students/yr",min:120,max:400,perK:1,pace:4.0,lag:1,eff:1,act:"Grow the completing cohort in step with intake"},
{id:"X39",p:"GO",w:6, nm:"Students successfully graduated",u:"students/yr",min:100,max:390,perK:1,der:"X38 \u00d7 X40",pace:0,lag:1,eff:2,act:"Follows cohort size and graduation rate"},
{id:"X40",p:"GO",w:10,nm:"Graduation rate",u:"%",min:55,max:99,pace:2.5,lag:1,eff:2,act:"Mentor at-risk students and clear backlog bottlenecks"},
{id:"X41",p:"GO",w:8, nm:"Pass percentage",u:"%",min:45,max:99,pace:4.5,lag:0,eff:2,act:"Strengthen remedial teaching and continuous assessment"},
{id:"X42",p:"GO",w:8, nm:"Students placed",u:"students/yr",min:30,max:350,perK:1,der:"X38 \u00d7 X43",pace:0,lag:0,eff:2,act:"Follows cohort size and placement rate"},
{id:"X43",p:"GO",w:14,nm:"Placement percentage",u:"%",min:25,max:98,pace:5.0,lag:0,eff:2,act:"Run structured placement preparation from the penultimate year and widen the recruiter base"},
{id:"X44",p:"GO",w:8, nm:"Median salary",u:"\u20b9 lakh/yr",min:2,max:20,pace:2.8,lag:1,eff:3,act:"Move up the recruiter tier rather than adding volume recruiters"},
{id:"X45",p:"GO",w:6, nm:"Average salary",u:"\u20b9 lakh/yr",min:2.5,max:28,pace:2.8,lag:1,eff:3,act:"Attract higher-paying roles through specialised skill tracks"},
{id:"X46",p:"GO",w:5, nm:"Students entering higher education",u:"students/yr",min:5,max:120,perK:1,der:"X38 \u00d7 X47",pace:0,lag:1,eff:1,act:"Follows cohort size and progression rate"},
{id:"X47",p:"GO",w:6, nm:"Higher-education percentage",u:"%",min:2,max:45,pace:4.5,lag:1,eff:1,act:"Counsel students toward postgraduate pathways and record the outcomes"},
{id:"X48",p:"GO",w:5, nm:"Students entering research or PhD",u:"students/yr",min:0.5,max:30,perK:1,pace:4.5,lag:1,eff:2,act:"Offer undergraduate research projects that lead into doctoral study"},
/* NOTE: the shipped prototype HTML carries min:0.2 on this row (copied from X31).
   Every calibrated figure in SPEC.md section 3 — all composites, parameter scores,
   arrival years and year-5 scores — reproduces to four decimals only with a floor
   of 1, so the calibrated value is used here. See README "Engine notes". */
{id:"X49",p:"GO",w:6, nm:"PhD graduates",u:"awards/yr",min:1,max:20,perK:1,der:"same as X31",pace:0,lag:3,eff:2,act:"Same figure as X31"},
{id:"X50",p:"GO",w:6, nm:"Internship participation",u:"%",min:10,max:100,pace:12,lag:0,eff:1,act:"Make a credited internship compulsory in every programme"},
{id:"X51",p:"GO",w:4, nm:"Professional certification outcomes",u:"certifications/yr",min:10,max:400,perK:1,pace:13,lag:0,eff:1,act:"Embed industry certification tracks into the curriculum"},
{id:"X52",p:"GO",w:4, nm:"Entrepreneurship and start-up outcomes",u:"ventures",min:0,max:40,pace:6.0,lag:1,eff:2,act:"Fund an incubator with seed support and a mentor network"},
// --- OI (15) ---
{id:"X53",p:"OI",w:4, nm:"Total female students",u:"students",min:100,max:550,perK:1,der:"X1 \u00d7 X54",pace:0,lag:0,eff:2,act:"Follows enrolment and gender share"},
{id:"X54",p:"OI",w:10,nm:"Female student percentage",u:"%",min:10,max:55,pace:4.0,lag:0,eff:2,act:"Set gender-balanced admission goals programme by programme"},
{id:"X55",p:"OI",w:4, nm:"Female faculty",u:"faculty",min:5,max:45,perK:1,der:"X2 \u00d7 X56",pace:0,lag:0,eff:2,act:"Follows faculty strength and gender share"},
{id:"X56",p:"OI",w:8, nm:"Female faculty percentage",u:"%",min:10,max:50,pace:4.0,lag:0,eff:2,act:"Apply a gender target to every recruitment round"},
{id:"X57",p:"OI",w:6, nm:"Students from other states",u:"students",min:30,max:600,perK:1,der:"X1 \u00d7 X58",pace:0,lag:0,eff:2,act:"Follows enrolment and out-of-state share"},
{id:"X58",p:"OI",w:10,nm:"Regional diversity percentage",u:"%",min:3,max:60,pace:6.0,lag:0,eff:2,act:"Build out-of-state admissions channels and hostel capacity together"},
{id:"X59",p:"OI",w:6, nm:"International students",u:"students",min:0,max:400,pace:5.0,lag:1,eff:3,act:"Pursue ICCR, Study in India and partner-country pipelines"},
{id:"X60",p:"OI",w:4, nm:"International faculty",u:"faculty",min:0,max:40,pace:4.5,lag:1,eff:3,act:"Create visiting and adjunct international appointments"},
{id:"X61",p:"OI",w:10,nm:"Economically disadvantaged students",u:"students",min:10,max:400,perK:1,pace:8.0,lag:0,eff:2,act:"Expand need-based fee waivers and publicise them"},
{id:"X62",p:"OI",w:10,nm:"Socially disadvantaged students",u:"students",min:20,max:500,perK:1,pace:7.0,lag:0,eff:2,act:"Meet reservation norms fully and support retention"},
{id:"X63",p:"OI",w:8, nm:"Students with disabilities",u:"students",min:0,max:20,perK:1,pace:6.0,lag:0,eff:2,act:"Make admissions and campus life genuinely accessible, then recruit"},
{id:"X64",p:"OI",w:8, nm:"Scholarships and financial assistance",u:"\u20b9 crore",min:0.02,max:8,perK:1,pace:9.0,lag:0,eff:2,act:"Increase the scholarship corpus and disburse it on time"},
{id:"X65",p:"OI",w:5, nm:"Accessible facilities compliance",u:"% compliant",min:0,max:100,pace:15,lag:0,eff:1,act:"Complete ramps, lifts, accessible toilets and assistive technology"},
{id:"X66",p:"OI",w:3, nm:"Hostels and support facilities",u:"hostels",min:0.3,max:3,perK:1,pace:3.0,lag:1,eff:3,act:"Add hostel capacity \u2014 this gates out-of-state and international intake"},
{id:"X67",p:"OI",w:4, nm:"Student diversity index",u:"0\u20131",min:0.2,max:0.9,der:"X54, X58, X62",pace:0,lag:0,eff:2,act:"Composite of gender, regional and social representation"},
// --- PR (12) ---
{id:"X68",p:"PR",w:20,nm:"Academic peer perception score",u:"/100",min:5,max:95,pace:2.0,lag:2,eff:3,act:"Earn peer standing through visible research, conferences and editorial roles"},
{id:"X69",p:"PR",w:20,nm:"Employer perception score",u:"/100",min:5,max:95,pace:2.4,lag:2,eff:3,act:"Build recruiter confidence through consistent graduate quality"},
{id:"X70",p:"PR",w:15,nm:"Overall perception score",u:"/100",min:5,max:95,der:"mean of X68, X69",pace:0,lag:2,eff:3,act:"Follows peer and employer perception"},
{id:"X71",p:"PR",w:8, nm:"National and international awards",u:"awards",min:0,max:30,pace:5.0,lag:1,eff:2,act:"Apply for institutional excellence awards and recognitions"},
{id:"X72",p:"PR",w:6, nm:"Major academic recognitions",u:"recognitions",min:0,max:25,pace:5.0,lag:1,eff:2,act:"Pursue centre-of-excellence status and council recognitions"},
{id:"X73",p:"PR",w:6, nm:"Industry collaborations (visibility)",u:"active",min:0,max:80,der:"same as X33",pace:0,lag:0,eff:1,act:"Same figure as X33"},
{id:"X74",p:"PR",w:6, nm:"International academic collaborations",u:"active",min:0,max:60,der:"same as X32",pace:0,lag:1,eff:2,act:"Same figure as X32"},
{id:"X75",p:"PR",w:6, nm:"Distinguished alumni achievements",u:"alumni",min:0,max:40,pace:2.2,lag:3,eff:2,act:"Build an alumni relations office and document achievements"},
{id:"X76",p:"PR",w:5, nm:"National and international visibility",u:"instances",min:0,max:50,pace:8.0,lag:1,eff:1,act:"Host national events and place faculty on government and sector panels"},
{id:"X77",p:"PR",w:4, nm:"Accreditation and recognition status",u:"index 0\u2013100",min:0,max:100,der:"same as X15",pace:0,lag:1,eff:3,act:"Same figure as X15"},
{id:"X78",p:"PR",w:2, nm:"Media and academic visibility",u:"mentions/yr",min:0,max:200,pace:12,lag:0,eff:1,act:"Run a communications function that places research stories"},
{id:"X79",p:"PR",w:2, nm:"Employer engagement",u:"recruiters",min:0,max:250,pace:10,lag:0,eff:1,act:"Bring recruiters on campus for lectures and projects year-round"}
];

export const IND_BY_ID: Readonly<Record<IndicatorId, Indicator>> = Object.fromEntries(
  IND.map((i) => [i.id, i]),
) as Record<IndicatorId, Indicator>;

export const ALL_IDS: readonly IndicatorId[] = IND.map((i) => i.id);

/** The 64 indicators a department can actually enter. */
export const ENTERABLE: readonly Indicator[] = IND.filter((i) => !i.der);

export const ENTERABLE_IDS: readonly IndicatorId[] = ENTERABLE.map((i) => i.id);

export function isIndicatorId(x: string): x is IndicatorId {
  return x in IND_BY_ID;
}
