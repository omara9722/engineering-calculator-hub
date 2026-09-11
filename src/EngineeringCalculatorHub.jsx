import React, { useState, useEffect, useMemo } from "react";
import {
  Zap,
  Cable,
  Gauge,
  SlidersHorizontal,
  Activity,
  Ruler,
  Sun,
  Moon,
  Printer,
  CircleCheck,
  CircleAlert,
  CircleX,
  BookOpen,
  ChevronDown,
} from "lucide-react";

/* ============================================================
   DESIGN TOKENS
   Instrument-panel aesthetic: a bench multimeter / VFD keypad,
   not a generic web calculator. Mono "LCD" readouts for numbers,
   sans UI face for labels/nav. Amber + teal duo, with functional
   green/amber/red status colors reserved for pass/fail meaning
   (voltage-drop margins, overload margins) rather than decoration.
   ============================================================ */

const THEMES = {
  dark: {
    backdrop: "#0D1214",
    panel: "#151C20",
    card: "#1C252A",
    cardAlt: "#111719",
    border: "#28333A",
    borderBright: "#3A4850",
    text: "#E7EDF0",
    textMuted: "#7E9198",
    textFaint: "#4E5D63",
    accent: "#F5A623",
    accent2: "#3ECFC0",
    good: "#3ECF8E",
    warn: "#F5A623",
    bad: "#EF6461",
    lcdBg: "#0E1618",
    lcdText: "#3ECFC0",
    shadow: "0 8px 24px rgba(0,0,0,0.45)",
  },
  light: {
    backdrop: "#EEF2F1",
    panel: "#FFFFFF",
    card: "#F7F9F8",
    cardAlt: "#EFF3F2",
    border: "#D7E0DE",
    borderBright: "#BFCBC8",
    text: "#152321",
    textMuted: "#5C716C",
    textFaint: "#93A5A1",
    accent: "#B9740F",
    accent2: "#1F9C8E",
    good: "#1E9E6A",
    warn: "#B9740F",
    bad: "#C24C42",
    lcdBg: "#0E1618",
    lcdText: "#3ECFC0",
    shadow: "0 8px 24px rgba(20,40,38,0.12)",
  },
};

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Roboto Mono", monospace';
const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/* ============================================================
   SHARED UI PRIMITIVES
   ============================================================ */

function Panel({ theme, children, style }) {
  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ theme, children }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: theme.textMuted,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Field({ theme, label, value, onChange, unit, step = "any", min }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 12.5,
          color: theme.textMuted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: theme.cardAlt,
            border: `1px solid ${theme.border}`,
            borderRadius: 7,
            padding: unit ? "9px 52px 9px 11px" : "9px 11px",
            color: theme.text,
            fontFamily: MONO,
            fontSize: 14.5,
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = theme.accent2)}
          onBlur={(e) => (e.target.style.borderColor = theme.border)}
        />
        {unit && (
          <span
            style={{
              position: "absolute",
              right: 11,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: MONO,
              fontSize: 12,
              color: theme.textFaint,
              pointerEvents: "none",
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

function SelectField({ theme, label, value, onChange, options }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 12.5,
          color: theme.textMuted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: theme.cardAlt,
          border: `1px solid ${theme.border}`,
          borderRadius: 7,
          padding: "9px 11px",
          color: theme.text,
          fontFamily: SANS,
          fontSize: 13.5,
          outline: "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SegButton({ theme, active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 10px",
        fontFamily: SANS,
        fontSize: 12.5,
        fontWeight: 600,
        borderRadius: 6,
        border: `1px solid ${active ? theme.accent2 : theme.border}`,
        background: active ? theme.accent2 : "transparent",
        color: active ? theme.cardAlt : theme.textMuted,
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
    >
      {children}
    </button>
  );
}

// The signature element: a bezeled LCD-style readout, used for the
// primary result of every calculator so the hub reads as a bench
// instrument rather than a generic form.
function Readout({ theme, label, value, unit, big = false, sub }) {
  return (
    <div
      style={{
        background: theme.lcdBg,
        borderRadius: 8,
        border: `1px solid ${theme.borderBright}`,
        padding: big ? "18px 18px 14px" : "12px 14px",
        boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 10.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#5C8580",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: big ? 34 : 20,
          color: "#3ECFC0",
          lineHeight: 1.1,
          textShadow: "0 0 14px rgba(62,207,192,0.35)",
          wordBreak: "break-all",
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: big ? 16 : 12, marginLeft: 6, opacity: 0.75 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 11.5,
            color: "#4E6E6A",
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function StatusPill({ theme, level, text }) {
  const map = {
    good: { c: theme.good, Icon: CircleCheck },
    warn: { c: theme.warn, Icon: CircleAlert },
    bad: { c: theme.bad, Icon: CircleX },
  };
  const { c, Icon } = map[level] || map.good;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${c}55`,
        background: `${c}18`,
        color: c,
        fontFamily: SANS,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {text}
    </div>
  );
}

// Collapsible "datasheet" panel listing the formulas/laws behind a
// calculator, so the hub doubles as a study aid, not just a black box.
function FormulaPanel({ theme, items, defaultOpen = false, title = "Formulas & rules used here" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Panel theme={theme} style={{ padding: 0, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: theme.text,
          fontFamily: SANS,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
          <BookOpen size={15} color={theme.accent2} />
          {title}
        </span>
        <ChevronDown
          size={16}
          color={theme.textMuted}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease" }}
        />
      </button>
      {open && (
        <div style={{ padding: "2px 16px 16px" }}>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderTop: `1px solid ${theme.border}`,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.text, marginBottom: 3 }}>
                {it.law}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  color: theme.accent2,
                  marginBottom: 4,
                }}
              >
                {it.formula}
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5 }}>
                {it.note}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function num(v, d = 2) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/* ============================================================
   CALCULATOR 1 — 3-Phase Motor Current
   ============================================================ */

function MotorCurrentCalc({ theme, onReport }) {
  const [powerUnit, setPowerUnit] = useState("kW");
  const [power, setPower] = useState("15");
  const [voltage, setVoltage] = useState("400");
  const [pf, setPf] = useState("0.85");
  const [eff, setEff] = useState("92");

  const P = parseFloat(power) || 0;
  const V = parseFloat(voltage) || 0;
  const PF = parseFloat(pf) || 0;
  const EFF = (parseFloat(eff) || 0) / 100;
  const watts = powerUnit === "kW" ? P * 1000 : P * 745.7;
  const current =
    V > 0 && PF > 0 && EFF > 0 ? watts / (Math.sqrt(3) * V * PF * EFF) : 0;
  const kVA = (Math.sqrt(3) * V * current) / 1000;
  const kW = (kVA * PF);

  useEffect(() => {
    onReport({
      title: "3-Phase Motor Current",
      rows: [
        ["Motor rating", `${power} ${powerUnit}`],
        ["Line voltage", `${voltage} V`],
        ["Power factor", pf],
        ["Efficiency", `${eff} %`],
      ],
      result: [
        ["Full-load current", `${num(current)} A`],
        ["Apparent power", `${num(kVA)} kVA`],
        ["Real power (electrical)", `${num(kW)} kW`],
      ],
    });
    // eslint-disable-next-line
  }, [power, powerUnit, voltage, pf, eff]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
      <Panel theme={theme} style={{ padding: 18 }}>
        <SectionLabel theme={theme}>Motor rating</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <SegButton
            theme={theme}
            active={powerUnit === "kW"}
            onClick={() => setPowerUnit("kW")}
          >
            kW
          </SegButton>
          <SegButton
            theme={theme}
            active={powerUnit === "HP"}
            onClick={() => setPowerUnit("HP")}
          >
            HP
          </SegButton>
        </div>
        <Field theme={theme} label="Rated power" value={power} onChange={setPower} unit={powerUnit} />
        <Field theme={theme} label="Line-to-line voltage" value={voltage} onChange={setVoltage} unit="V" />
        <Field theme={theme} label="Power factor (cos φ)" value={pf} onChange={setPf} step="0.01" />
        <Field theme={theme} label="Motor efficiency" value={eff} onChange={setEff} unit="%" />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Readout theme={theme} label="Full-load current" value={num(current)} unit="A" big sub="I = P ÷ (√3 · V · PF · η)" />
        </div>
        <Readout theme={theme} label="Apparent power" value={num(kVA)} unit="kVA" />
        <Readout theme={theme} label="Real power" value={num(kW)} unit="kW" />
      </div>

      <FormulaPanel
        theme={theme}
        items={[
          {
            law: "Full-load current (3-phase)",
            formula: "I = P ÷ (√3 · V · PF · η)",
            note: "P is the electrical input power in watts. Dividing by efficiency (η) converts the motor's mechanical output rating back to the electrical power it actually draws from the supply.",
          },
          {
            law: "HP to Watts conversion",
            formula: "P(W) = HP × 745.7",
            note: "Used only when the rating is entered in horsepower instead of kW.",
          },
          {
            law: "Apparent power (3-phase)",
            formula: "S = √3 · V · I",
            note: "Total power the supply must deliver, in kVA — includes both real and reactive components.",
          },
          {
            law: "Real power from apparent power",
            formula: "P = S × PF",
            note: "Power factor (cos φ) is the fraction of apparent power actually doing useful work.",
          },
          {
            law: "√3 constant",
            formula: "√3 ≈ 1.732",
            note: "Appears in every 3-phase formula because line current and line voltage are 120° apart across the three phases.",
          },
        ]}
      />
    </div>
  );
}

/* ============================================================
   CALCULATOR 2 — Voltage Drop
   ============================================================ */

function VoltageDropCalc({ theme, onReport }) {
  const [phase, setPhase] = useState("3");
  const [material, setMaterial] = useState("cu");
  const [length, setLength] = useState("50");
  const [area, setArea] = useState("6");
  const [current, setCurrent] = useState("30");
  const [voltage, setVoltage] = useState("400");

  const RESIST = { cu: 0.017241, al: 0.0282 }; // ohm*mm2/m at ~20C

  const L = parseFloat(length) || 0;
  const A = parseFloat(area) || 0;
  const I = parseFloat(current) || 0;
  const V = parseFloat(voltage) || 0;
  const rho = RESIST[material];
  const R = A > 0 ? (rho * L) / A : 0;
  const vdrop = phase === "1" ? 2 * I * R : Math.sqrt(3) * I * R;
  const pct = V > 0 ? (vdrop / V) * 100 : 0;

  let level = "good",
    text = "Within 3% — good practice";
  if (pct > 5) {
    level = "bad";
    text = "Exceeds 5% — exceeds typical limit";
  } else if (pct > 3) {
    level = "warn";
    text = "3–5% — acceptable, check total run";
  }

  useEffect(() => {
    onReport({
      title: "Voltage Drop",
      rows: [
        ["System", phase === "1" ? "Single-phase" : "Three-phase"],
        ["Conductor", material === "cu" ? "Copper" : "Aluminum"],
        ["One-way length", `${length} m`],
        ["Conductor CSA", `${area} mm²`],
        ["Load current", `${current} A`],
        ["Supply voltage", `${voltage} V`],
      ],
      result: [
        ["Voltage drop", `${num(vdrop)} V`],
        ["Percent drop", `${num(pct)} %`],
        ["Assessment", text],
      ],
    });
    // eslint-disable-next-line
  }, [phase, material, length, area, current, voltage]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Panel theme={theme} style={{ padding: 18 }}>
        <SectionLabel theme={theme}>Circuit</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <SegButton theme={theme} active={phase === "1"} onClick={() => setPhase("1")}>
            Single-phase
          </SegButton>
          <SegButton theme={theme} active={phase === "3"} onClick={() => setPhase("3")}>
            Three-phase
          </SegButton>
        </div>
        <SelectField
          theme={theme}
          label="Conductor material"
          value={material}
          onChange={setMaterial}
          options={[
            { value: "cu", label: "Copper (ρ = 0.0172 Ω·mm²/m)" },
            { value: "al", label: "Aluminum (ρ = 0.0282 Ω·mm²/m)" },
          ]}
        />
        <Field theme={theme} label="One-way cable length" value={length} onChange={setLength} unit="m" />
        <Field theme={theme} label="Conductor cross-section" value={area} onChange={setArea} unit="mm²" />
        <Field theme={theme} label="Load current" value={current} onChange={setCurrent} unit="A" />
        <Field theme={theme} label="Supply voltage" value={voltage} onChange={setVoltage} unit="V" />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Readout theme={theme} label="Voltage drop" value={num(vdrop)} unit="V" big />
        <Readout theme={theme} label="Percent drop" value={num(pct)} unit="%" big />
        <div style={{ gridColumn: "1 / -1" }}>
          <StatusPill theme={theme} level={level} text={text} />
        </div>
      </div>

      <FormulaPanel
        theme={theme}
        items={[
          {
            law: "Ohm's Law",
            formula: "V = I × R",
            note: "The foundation of the whole calculation — voltage drop is simply the current multiplied by the resistance of the conductor it flows through.",
          },
          {
            law: "Conductor resistance",
            formula: "R = ρ · L ÷ A",
            note: "ρ is the material's resistivity (Ω·mm²/m), L the one-way cable length, A the cross-sectional area. Bigger conductors and shorter runs mean lower resistance.",
          },
          {
            law: "Single-phase voltage drop",
            formula: "Vdrop = 2 × I × R",
            note: "The ×2 accounts for current making a round trip — out on the line conductor, back on the neutral/return.",
          },
          {
            law: "Three-phase voltage drop",
            formula: "Vdrop = √3 × I × R",
            note: "Line-to-line drop for a balanced 3-phase load — no separate return conductor needed for the calculation.",
          },
          {
            law: "Percent voltage drop rule of thumb",
            formula: "%Vdrop = (Vdrop ÷ V) × 100",
            note: "Common design guidance (e.g. NEC/IEC informative notes) targets ≤3% on a branch circuit and ≤5% total from source to load — beyond that, motors run hot and lighting flickers/dims.",
          },
          {
            law: "Resistivity is temperature-dependent",
            formula: "ρ_T = ρ₂₀[1 + α(T − 20°C)]",
            note: "Resistivity values used here are standard 20°C figures. Conductors running hot (e.g. fully loaded, high ambient) will have slightly higher resistance and drop than this calculator shows.",
          },
        ]}
      />
    </div>
  );
}

/* ============================================================
   CALCULATOR 3 — Motor kW <-> HP Converter
   ============================================================ */

function KwHpCalc({ theme, onReport }) {
  const FACTOR = 0.745699872;
  const [kw, setKw] = useState("11");
  const [hp, setHp] = useState((11 / FACTOR).toFixed(3));
  const [last, setLast] = useState("kw");

  const handleKw = (v) => {
    setKw(v);
    const n = parseFloat(v);
    setHp(isFinite(n) ? (n / FACTOR).toFixed(3) : "");
    setLast("kw");
  };
  const handleHp = (v) => {
    setHp(v);
    const n = parseFloat(v);
    setKw(isFinite(n) ? (n * FACTOR).toFixed(3) : "");
    setLast("hp");
  };

  useEffect(() => {
    onReport({
      title: "Motor kW ↔ HP Converter",
      rows: [["Conversion factor", "1 HP = 0.7457 kW"]],
      result: [
        ["Kilowatts", `${kw} kW`],
        ["Horsepower", `${hp} HP`],
      ],
    });
    // eslint-disable-next-line
  }, [kw, hp]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Panel theme={theme} style={{ padding: 18 }}>
        <SectionLabel theme={theme}>Enter either value — the other updates live</SectionLabel>
        <Field theme={theme} label="Kilowatts" value={kw} onChange={handleKw} unit="kW" />
        <Field theme={theme} label="Horsepower" value={hp} onChange={handleHp} unit="HP" />
      </Panel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Readout theme={theme} label="Kilowatts" value={kw || "0"} unit="kW" big sub={last === "hp" ? "derived" : "entered"} />
        <Readout theme={theme} label="Horsepower" value={hp || "0"} unit="HP" big sub={last === "kw" ? "derived" : "entered"} />
      </div>

      <FormulaPanel
        theme={theme}
        items={[
          {
            law: "kW ↔ HP conversion constant",
            formula: "1 HP = 0.745699872 kW",
            note: "Defined from mechanical horsepower: 1 HP = 33,000 ft·lbf/min. This is the imperial/SI bridge you'll use constantly on nameplates and datasheets.",
          },
          {
            law: "Watt's Law (definition of power)",
            formula: "P = W ÷ t  (Watt = Joule/second)",
            note: "The SI Watt is defined as one joule of energy transferred per second — kW is just 1000 of those.",
          },
          {
            law: "Nameplate rating note",
            formula: "P_shaft ≠ P_electrical",
            note: "kW/HP on a motor nameplate is the mechanical output at the shaft, not the electrical input — that's why the motor current calculator divides by efficiency (η) to get the true electrical draw.",
          },
        ]}
      />
    </div>
  );
}

/* ============================================================
   CALCULATOR 4 — VFD Sizing
   ============================================================ */

const VFD_LADDER = [1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250];

function VfdSizingCalc({ theme, onReport }) {
  const [powerUnit, setPowerUnit] = useState("kW");
  const [power, setPower] = useState("15");
  const [voltage, setVoltage] = useState("400");
  const [pf, setPf] = useState("0.85");
  const [eff, setEff] = useState("92");
  const [duty, setDuty] = useState("variable");
  const [margin, setMargin] = useState("15");

  const P = parseFloat(power) || 0;
  const V = parseFloat(voltage) || 0;
  const PF = parseFloat(pf) || 0;
  const EFF = (parseFloat(eff) || 0) / 100;
  const watts = powerUnit === "kW" ? P * 1000 : P * 745.7;
  const fla = V > 0 && PF > 0 && EFF > 0 ? watts / (Math.sqrt(3) * V * PF * EFF) : 0;
  const dutyFactor = duty === "constant" ? 1.1 : 1.0; // constant torque apps typically want more overload headroom
  const marginFactor = 1 + (parseFloat(margin) || 0) / 100;
  const required = fla * dutyFactor * marginFactor;
  const suggestedKw = VFD_LADDER.find((k) => {
    // rough FLA estimate for a standard 400V, 0.85 PF, 92% eff motor at rating k
    const w = k * 1000;
    const estFla = w / (Math.sqrt(3) * 400 * 0.85 * 0.92);
    return estFla >= required;
  });

  useEffect(() => {
    onReport({
      title: "VFD Sizing",
      rows: [
        ["Motor rating", `${power} ${powerUnit}`],
        ["Line voltage", `${voltage} V`],
        ["Power factor", pf],
        ["Efficiency", `${eff} %`],
        ["Duty type", duty === "constant" ? "Constant torque" : "Variable torque"],
        ["Design margin", `${margin} %`],
      ],
      result: [
        ["Motor full-load current", `${num(fla)} A`],
        ["Required VFD output current", `${num(required)} A`],
        ["Suggested VFD frame", suggestedKw ? `≥ ${suggestedKw} kW class` : "Exceeds standard ladder — check manufacturer table"],
      ],
    });
    // eslint-disable-next-line
  }, [power, powerUnit, voltage, pf, eff, duty, margin]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Panel theme={theme} style={{ padding: 18 }}>
        <SectionLabel theme={theme}>Motor</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <SegButton theme={theme} active={powerUnit === "kW"} onClick={() => setPowerUnit("kW")}>kW</SegButton>
          <SegButton theme={theme} active={powerUnit === "HP"} onClick={() => setPowerUnit("HP")}>HP</SegButton>
        </div>
        <Field theme={theme} label="Rated power" value={power} onChange={setPower} unit={powerUnit} />
        <Field theme={theme} label="Line-to-line voltage" value={voltage} onChange={setVoltage} unit="V" />
        <Field theme={theme} label="Power factor" value={pf} onChange={setPf} step="0.01" />
        <Field theme={theme} label="Motor efficiency" value={eff} onChange={setEff} unit="%" />
      </Panel>

      <Panel theme={theme} style={{ padding: 18 }}>
        <SectionLabel theme={theme}>Application</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <SegButton theme={theme} active={duty === "variable"} onClick={() => setDuty("variable")}>Variable torque</SegButton>
          <SegButton theme={theme} active={duty === "constant"} onClick={() => setDuty("constant")}>Constant torque</SegButton>
        </div>
        <Field theme={theme} label="Design margin" value={margin} onChange={setMargin} unit="%" />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Readout theme={theme} label="Motor FLA" value={num(fla)} unit="A" />
        <Readout theme={theme} label="Required VFD current" value={num(required)} unit="A" />
        <div style={{ gridColumn: "1 / -1" }}>
          <Readout
            theme={theme}
            label="Suggested VFD frame"
            value={suggestedKw ? `≥ ${suggestedKw}` : "—"}
            unit={suggestedKw ? "kW class" : ""}
            big
            sub="Verify against the manufacturer's exact current-rating table"
          />
        </div>
      </div>

      <FormulaPanel
        theme={theme}
        items={[
          {
            law: "Motor full-load current (FLA)",
            formula: "FLA = P ÷ (√3 · V · PF · η)",
            note: "Same 3-phase current formula as the motor-current calculator — the VFD must be able to continuously supply at least this current.",
          },
          {
            law: "Sizing rule",
            formula: "I_VFD ≥ FLA × duty factor × (1 + margin)",
            note: "Never size a VFD below the motor's FLA. A margin (commonly 10–20%) covers nameplate tolerance, harmonics, and future re-rating of the driven load.",
          },
          {
            law: "Constant vs. variable torque duty",
            formula: "Constant torque needs more overload headroom",
            note: "Conveyors, extruders, and hoists (constant torque) demand high current at low speed and need more overload capacity than pumps/fans (variable torque, where torque falls with the square of speed).",
          },
          {
            law: "Overload classes (typical)",
            formula: "Normal Duty ≈ 110% for 60s · Heavy Duty ≈ 150% for 60s",
            note: "Most drives are rated for two overload classes — check the manufacturer's datasheet against your load's starting/peak current needs.",
          },
          {
            law: "Real-world derating factors",
            formula: "Altitude, ambient temp, and PWM carrier frequency all derate output current",
            note: "A VFD sized correctly on paper can still need up-sizing at high altitude, high ambient temperature, or when a higher carrier frequency is used to quiet motor noise.",
          },
        ]}
      />
    </div>
  );
}

/* ============================================================
   CALCULATOR 5 — Power / Current / Power-Factor
   ============================================================ */

function PowerCalc({ theme, onReport }) {
  const [phase, setPhase] = useState("3");
  const [voltage, setVoltage] = useState("400");
  const [current, setCurrent] = useState("20");
  const [pf, setPf] = useState("0.9");

  const V = parseFloat(voltage) || 0;
  const I = parseFloat(current) || 0;
  const PF = parseFloat(pf) || 0;
  const S = (phase === "1" ? V * I : Math.sqrt(3) * V * I) / 1000;
  const P = S * PF;
  const Q = Math.sqrt(Math.max(S * S - P * P, 0));

  useEffect(() => {
    onReport({
      title: "Power / Current / PF",
      rows: [
        ["System", phase === "1" ? "Single-phase" : "Three-phase"],
        ["Voltage", `${voltage} V`],
        ["Current", `${current} A`],
        ["Power factor", pf],
      ],
      result: [
        ["Real power", `${num(P)} kW`],
        ["Apparent power", `${num(S)} kVA`],
        ["Reactive power", `${num(Q)} kVAR`],
      ],
    });
    // eslint-disable-next-line
  }, [phase, voltage, current, pf]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Panel theme={theme} style={{ padding: 18 }}>
        <SectionLabel theme={theme}>Inputs</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <SegButton theme={theme} active={phase === "1"} onClick={() => setPhase("1")}>Single-phase</SegButton>
          <SegButton theme={theme} active={phase === "3"} onClick={() => setPhase("3")}>Three-phase</SegButton>
        </div>
        <Field theme={theme} label="Voltage" value={voltage} onChange={setVoltage} unit="V" />
        <Field theme={theme} label="Current" value={current} onChange={setCurrent} unit="A" />
        <Field theme={theme} label="Power factor (cos φ)" value={pf} onChange={setPf} step="0.01" />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Readout theme={theme} label="Real power" value={num(P)} unit="kW" big />
        </div>
        <Readout theme={theme} label="Apparent power" value={num(S)} unit="kVA" />
        <Readout theme={theme} label="Reactive power" value={num(Q)} unit="kVAR" />
      </div>

      <FormulaPanel
        theme={theme}
        items={[
          {
            law: "The power triangle",
            formula: "S² = P² + Q²",
            note: "Real power (P, kW — does useful work), reactive power (Q, kVAR — sustains magnetic fields in motors/transformers) and apparent power (S, kVA — what the supply actually delivers) form a right triangle.",
          },
          {
            law: "Power factor",
            formula: "PF = cos φ = P ÷ S",
            note: "φ is the phase angle between voltage and current. PF = 1 means all delivered power is useful; a low PF means more current is needed for the same real power.",
          },
          {
            law: "Single-phase power",
            formula: "P = V × I × PF",
            note: "Used for single-phase loads — no √3 term because there's only one phase conductor and one voltage.",
          },
          {
            law: "Three-phase power",
            formula: "P = √3 × V_L × I_L × PF",
            note: "V_L and I_L are line-to-line voltage and line current respectively, for a balanced 3-phase system.",
          },
          {
            law: "Ohm's Law (underlying all of it)",
            formula: "V = I × R,  P = V × I",
            note: "Every AC power formula here is a phase/PF-aware extension of these two basic DC relationships.",
          },
        ]}
      />
    </div>
  );
}

/* ============================================================
   CALCULATOR 6 — Engineering Unit Converter
   ============================================================ */

const UNIT_CATS = {
  power: {
    label: "Power",
    units: { W: 1, kW: 1000, MW: 1e6, HP: 745.7, "BTU/h": 0.29307107 },
  },
  torque: {
    label: "Torque",
    units: { "N·m": 1, "lbf·ft": 1.35582, "lbf·in": 0.112985, "kgf·m": 9.80665 },
  },
  pressure: {
    label: "Pressure",
    units: { Pa: 1, kPa: 1000, bar: 100000, psi: 6894.76, atm: 101325 },
  },
  length: {
    label: "Length",
    units: { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 },
  },
  energy: {
    label: "Energy",
    units: { J: 1, kJ: 1000, Wh: 3600, kWh: 3.6e6, BTU: 1055.06 },
  },
};

function tempConvert(v, from, to) {
  // normalize to Celsius first
  let c;
  if (from === "C") c = v;
  else if (from === "F") c = ((v - 32) * 5) / 9;
  else c = v - 273.15;

  if (to === "C") return c;
  if (to === "F") return (c * 9) / 5 + 32;
  return c + 273.15;
}

function UnitConverterCalc({ theme, onReport }) {
  const [cat, setCat] = useState("power");
  const [from, setFrom] = useState("kW");
  const [to, setTo] = useState("HP");
  const [value, setValue] = useState("10");

  const isTemp = cat === "temperature";
  const units = isTemp ? { C: 1, F: 1, K: 1 } : UNIT_CATS[cat].units;
  const unitKeys = Object.keys(units);

  useEffect(() => {
    const keys = isTemp ? ["C", "F", "K"] : Object.keys(UNIT_CATS[cat].units);
    setFrom(keys[0]);
    setTo(keys[1] || keys[0]);
    // eslint-disable-next-line
  }, [cat]);

  const V = parseFloat(value) || 0;
  let result = 0;
  if (isTemp) {
    result = tempConvert(V, from, to);
  } else {
    const table = UNIT_CATS[cat].units;
    const base = V * (table[from] || 1);
    result = base / (table[to] || 1);
  }

  useEffect(() => {
    onReport({
      title: "Engineering Unit Converter",
      rows: [
        ["Category", isTemp ? "Temperature" : UNIT_CATS[cat].label],
        ["From", `${value} ${from}`],
      ],
      result: [["Converted value", `${num(result, 4)} ${to}`]],
    });
    // eslint-disable-next-line
  }, [cat, from, to, value]);

  const categoryOptions = [
    ...Object.entries(UNIT_CATS).map(([k, v]) => ({ value: k, label: v.label })),
    { value: "temperature", label: "Temperature" },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Panel theme={theme} style={{ padding: 18 }}>
        <SectionLabel theme={theme}>Category</SectionLabel>
        <SelectField theme={theme} label="Quantity" value={cat} onChange={setCat} options={categoryOptions} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <SelectField
            theme={theme}
            label="From"
            value={from}
            onChange={setFrom}
            options={unitKeys.map((u) => ({ value: u, label: u }))}
          />
          <SelectField
            theme={theme}
            label="To"
            value={to}
            onChange={setTo}
            options={unitKeys.map((u) => ({ value: u, label: u }))}
          />
        </div>
        <Field theme={theme} label="Value" value={value} onChange={setValue} unit={from} />
      </Panel>

      <Readout theme={theme} label={`${value} ${from} equals`} value={num(result, 4)} unit={to} big />

      <FormulaPanel
        theme={theme}
        items={[
          {
            law: "Conversion via a common base unit",
            formula: "value_to = value_from × factor_from ÷ factor_to",
            note: "Every unit in a category is first expressed as a multiple of one SI base unit (e.g. the Watt for power), then converted to the target unit — this avoids needing a separate formula for every possible pair.",
          },
          {
            law: "Temperature is an offset, not just a scale",
            formula: "°F = °C × 9/5 + 32,  K = °C + 273.15",
            note: "Unlike power, length, or pressure, temperature scales don't share a common zero point, so conversion needs an additive offset in addition to a multiplier.",
          },
          {
            law: "Why this matters for motors/drives",
            formula: "Torque(N·m) = P(W) ÷ ω(rad/s)",
            note: "A handy bonus relationship: once you know a motor's power and shaft speed, torque follows directly — useful when cross-checking VFD or gearbox specs given in mixed units.",
          },
        ]}
      />
    </div>
  );
}

/* ============================================================
   CALCULATOR 7 — Reference / Laws (study page, no live calc)
   ============================================================ */

const REFERENCE_GROUPS = [
  {
    title: "Fundamental laws",
    items: [
      { law: "Ohm's Law", formula: "V = I × R", note: "Relates voltage, current, and resistance in any DC circuit or resistive AC element." },
      { law: "Joule's Law (heating effect)", formula: "P = I² × R", note: "Power dissipated as heat in a resistance — the reason undersized cables and connections run hot." },
      { law: "Kirchhoff's Current Law (KCL)", formula: "ΣI_in = ΣI_out at a node", note: "Current entering a junction equals current leaving it — total charge is conserved." },
      { law: "Kirchhoff's Voltage Law (KVL)", formula: "ΣV around a closed loop = 0", note: "The sum of voltage rises and drops around any closed loop is zero — the basis of mesh/loop circuit analysis." },
      { law: "Watt's Law", formula: "P = V × I", note: "Basic definition of electrical power — combine with Ohm's Law to get P = I²R or P = V²/R." },
    ],
  },
  {
    title: "AC & power fundamentals",
    items: [
      { law: "Power triangle", formula: "S² = P² + Q²", note: "Apparent (S, kVA), real (P, kW), and reactive (Q, kVAR) power relate as the sides of a right triangle." },
      { law: "Power factor", formula: "PF = cos φ = P ÷ S", note: "φ is the angle between voltage and current waveforms; a low PF means the supply carries more current than the useful work requires." },
      { law: "Single-phase power", formula: "P = V × I × PF", note: "For loads fed from a single live + neutral." },
      { law: "Three-phase power", formula: "P = √3 × V_L × I_L × PF", note: "For balanced 3-phase loads — the standard formula for industrial motors and drives." },
      { law: "RMS vs peak (sinusoidal)", formula: "V_RMS = V_peak ÷ √2", note: "Nameplate and multimeter AC readings are RMS values, not the instantaneous peak of the sine wave." },
    ],
  },
  {
    title: "Conductors & voltage drop",
    items: [
      { law: "Resistance from resistivity", formula: "R = ρ × L ÷ A", note: "Longer or thinner conductors have more resistance; resistivity (ρ) is a material property." },
      { law: "Common resistivity values (20°C)", formula: "Copper ≈ 0.0172 Ω·mm²/m · Aluminum ≈ 0.0282 Ω·mm²/m", note: "Aluminum needs roughly 1.6× the cross-section of copper to carry the same current with equal drop." },
      { law: "Voltage drop limit (rule of thumb)", formula: "Branch ≤ 3% · Total ≤ 5%", note: "Widely used design guidance to keep motors from overheating and lighting from flickering — always confirm against your local code." },
    ],
  },
  {
    title: "Motors & drives",
    items: [
      { law: "Full-load current (FLA)", formula: "I = P ÷ (√3 · V · PF · η)", note: "The steady-state current a 3-phase motor draws at rated output." },
      { law: "Motor efficiency", formula: "η = P_output(mechanical) ÷ P_input(electrical)", note: "Nameplate kW/HP is mechanical shaft output — always less than what the motor actually draws electrically." },
      { law: "Torque–power–speed relationship", formula: "P = T × ω  (ω in rad/s = 2π × N/60)", note: "Power, torque, and rotational speed (N in RPM) are always linked — useful for checking VFD, gearbox, or load specs." },
      { law: "VFD sizing rule", formula: "I_VFD ≥ FLA × margin", note: "Always size a drive at or above motor FLA, with margin for overload, harmonics, and derating (altitude, ambient temp, carrier frequency)." },
      { law: "NEMA/IEC service factor", formula: "Max continuous load = Nameplate P × SF", note: "A motor with SF = 1.15 can handle 15% overload continuously without exceeding its insulation temperature rating." },
    ],
  },
  {
    title: "Handy constants",
    items: [
      { law: "√3", formula: "≈ 1.7320508", note: "Appears throughout 3-phase formulas due to the 120° phase separation between lines." },
      { law: "HP to Watts", formula: "1 HP = 745.699872 W", note: "Mechanical horsepower, the version used for motor ratings (vs. metric or electrical horsepower, which differ slightly)." },
      { law: "Temperature coefficient of resistance (copper)", formula: "α ≈ 0.00393 /°C", note: "Explains why conductor resistance — and voltage drop — rises as cables run hotter under load." },
    ],
  },
];

function ReferencePage({ theme, onReport }) {
  useEffect(() => {
    if (onReport) onReport(null);
    // eslint-disable-next-line
  }, []);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel theme={theme} style={{ padding: 18 }}>
        <div style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.6 }}>
          A quick-reference sheet of the laws and formulas behind every calculator in this hub —
          useful for double-checking a result by hand, or for revision if you're studying this material.
        </div>
      </Panel>
      {REFERENCE_GROUPS.map((group) => (
        <FormulaPanel key={group.title} theme={theme} items={group.items} defaultOpen={true} title={group.title} />
      ))}
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */

const TOOLS = [
  { id: "motor-current", label: "Motor Current", short: "3φ Current", Icon: Zap, Comp: MotorCurrentCalc },
  { id: "voltage-drop", label: "Voltage Drop", short: "V-Drop", Icon: Cable, Comp: VoltageDropCalc },
  { id: "kw-hp", label: "kW ↔ HP", short: "kW/HP", Icon: Gauge, Comp: KwHpCalc },
  { id: "vfd", label: "VFD Sizing", short: "VFD", Icon: SlidersHorizontal, Comp: VfdSizingCalc },
  { id: "power-pf", label: "Power / PF", short: "Power", Icon: Activity, Comp: PowerCalc },
  { id: "units", label: "Unit Converter", short: "Units", Icon: Ruler, Comp: UnitConverterCalc },
  { id: "reference", label: "Reference / Laws", short: "Reference", Icon: BookOpen, Comp: ReferencePage },
];

export default function EngineeringCalculatorHub() {
  const [mode, setMode] = useState("dark");
  const [active, setActive] = useState("motor-current");
  const [report, setReport] = useState(null);
  const theme = THEMES[mode];
  const activeTool = TOOLS.find((t) => t.id === active);
  const ActiveComp = activeTool.Comp;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        fontFamily: SANS,
        background: theme.backdrop,
        color: theme.text,
        minHeight: "100vh",
        transition: "background 150ms ease, color 150ms ease",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.5; }
        .ech-scroll::-webkit-scrollbar { height: 6px; }
        .ech-scroll::-webkit-scrollbar-thumb { background: ${theme.borderBright}; border-radius: 4px; }

        @media print {
          .ech-noprint { display: none !important; }
          .ech-printarea { display: block !important; }
          body { background: #fff; }
        }
        .ech-printarea { display: none; }
      `}</style>

      {/* ---------- Header ---------- */}
      <div
        className="ech-noprint"
        style={{
          borderBottom: `1px solid ${theme.border}`,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: theme.accent2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.cardAlt,
              flexShrink: 0,
            }}
          >
            <Zap size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Engineering Calculator Hub
            </div>
            <div style={{ fontSize: 11.5, color: theme.textMuted, fontFamily: MONO }}>
              motor · power · sizing · conversions
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handlePrint}
            disabled={!report}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 13px",
              borderRadius: 7,
              border: `1px solid ${theme.border}`,
              background: theme.card,
              color: report ? theme.text : theme.textFaint,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: report ? "pointer" : "not-allowed",
              opacity: report ? 1 : 0.6,
            }}
            title={report ? "Export current result as PDF" : "Open a calculator first"}
          >
            <Printer size={14} />
            Export PDF
          </button>
          <button
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            style={{
              width: 34,
              height: 34,
              borderRadius: 7,
              border: `1px solid ${theme.border}`,
              background: theme.card,
              color: theme.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Toggle dark / light mode"
          >
            {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* ---------- Nav (icon rail / top tabs) ---------- */}
      <div
        className="ech-noprint ech-scroll"
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 20px",
          overflowX: "auto",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        {TOOLS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 13px",
                borderRadius: 8,
                border: `1px solid ${isActive ? theme.accent : theme.border}`,
                background: isActive ? `${theme.accent}1A` : theme.card,
                color: isActive ? theme.accent : theme.textMuted,
                fontSize: 12.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <t.Icon size={15} strokeWidth={2.3} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ---------- Main ---------- */}
      <div className="ech-noprint" style={{ maxWidth: 640, margin: "0 auto", padding: "22px 18px 60px" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{activeTool.label}</div>
        </div>
        <ActiveComp theme={theme} onReport={setReport} />
      </div>

      {/* ---------- Print-only report ---------- */}
      <div className="ech-printarea ech-printarea" style={{ padding: 24, color: "#111", fontFamily: SANS }}>
        {report && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
              Engineering Calculator Hub
            </div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 18 }}>
              {report.title} — {new Date().toLocaleString()}
            </div>

            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#777", marginBottom: 8 }}>
              Inputs
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
              <tbody>
                {report.rows.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "6px 0", borderBottom: "1px solid #ddd", color: "#555" }}>{k}</td>
                    <td style={{ padding: "6px 0", borderBottom: "1px solid #ddd", textAlign: "right", fontFamily: MONO }}>
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#777", marginBottom: 8 }}>
              Result
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {report.result.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #eee", fontWeight: 600 }}>{k}</td>
                    <td style={{ padding: "8px 0", borderBottom: "1px solid #eee", textAlign: "right", fontFamily: MONO, fontWeight: 700 }}>
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
