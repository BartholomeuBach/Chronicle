// Chronicle — paste this file into the AI Dungeon Input script tab.
"use strict";
(() => {
  // src/chronicle/calendar/elapsed-time.ts
  var SECONDS_PER_MINUTE = 60;
  var SECONDS_PER_HOUR = 3600;
  var SECONDS_PER_DAY = 86400;
  function createElapsedTime(input) {
    assertNonNegativeSafeIntegers(input);
    const totalSeconds = assertSafeInteger(
      assertSafeInteger(input.days * SECONDS_PER_DAY, "days") + assertSafeInteger(input.hours * SECONDS_PER_HOUR, "hours") + assertSafeInteger(input.minutes * SECONDS_PER_MINUTE, "minutes") + input.seconds,
      "elapsed time"
    );
    const days = Math.floor(totalSeconds / SECONDS_PER_DAY);
    const secondsWithinDay = totalSeconds % SECONDS_PER_DAY;
    return Object.freeze({
      days,
      hours: Math.floor(secondsWithinDay / SECONDS_PER_HOUR),
      minutes: Math.floor(secondsWithinDay % SECONDS_PER_HOUR / SECONDS_PER_MINUTE),
      seconds: secondsWithinDay % SECONDS_PER_MINUTE
    });
  }
  function isZeroElapsedTime(elapsedTime) {
    return elapsedTime.days === 0 && elapsedTime.hours === 0 && elapsedTime.minutes === 0 && elapsedTime.seconds === 0;
  }
  function assertNonNegativeSafeIntegers(input) {
    for (const [name, value] of Object.entries(input)) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(`${name} must be a non-negative safe integer.`);
      }
    }
  }
  function assertSafeInteger(value, component) {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`${component} cannot be represented safely.`);
    }
    return value;
  }

  // src/chronicle/calendar/normalize-gregorian-date-time.ts
  var SECONDS_PER_DAY2 = 86400;
  var MIN_YEAR = 1;
  var MAX_YEAR = 9999;
  var CUMULATIVE_DAYS_BEFORE_MONTH = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  function normalizeGregorianDateTime(input) {
    assertSafeIntegerComponents(input);
    const monthIndex = assertSafeInteger2(input.month - 1, "month normalization");
    const yearFromMonth = floorDiv(monthIndex, 12);
    const normalizedYear = assertSafeInteger2(input.year + yearFromMonth, "year normalization");
    const normalizedMonth = modulo(monthIndex, 12) + 1;
    const totalSeconds = assertSafeInteger2(
      assertSafeInteger2(input.hour * 3600, "hour normalization") + assertSafeInteger2(input.minute * 60, "minute normalization") + input.second,
      "time normalization"
    );
    const dayFromTime = floorDiv(totalSeconds, SECONDS_PER_DAY2);
    const secondOfDay = modulo(totalSeconds, SECONDS_PER_DAY2);
    const day = assertSafeInteger2(input.day + dayFromTime, "day normalization");
    const ordinal = assertSafeInteger2(
      daysBeforeYear(normalizedYear) + daysBeforeMonth(normalizedYear, normalizedMonth) + day - 1,
      "date normalization"
    );
    const normalizedDate = dateFromOrdinal(ordinal);
    return Object.freeze({
      ...normalizedDate,
      hour: floorDiv(secondOfDay, 3600),
      minute: floorDiv(modulo(secondOfDay, 3600), 60),
      second: modulo(secondOfDay, 60)
    });
  }
  function isNormalizedGregorianDateTime(value) {
    if (value === null || typeof value !== "object") return false;
    const candidate = value;
    if (Object.keys(candidate).length !== 6 || !Object.values(candidate).every(Number.isSafeInteger)) return false;
    try {
      const normalized = normalizeGregorianDateTime(candidate);
      return normalized.year === candidate.year && normalized.month === candidate.month && normalized.day === candidate.day && normalized.hour === candidate.hour && normalized.minute === candidate.minute && normalized.second === candidate.second;
    } catch (e) {
      return false;
    }
  }
  function assertSafeIntegerComponents(input) {
    for (const [name, value] of Object.entries(input)) {
      if (!Number.isSafeInteger(value)) {
        throw new RangeError(`${name} must be a finite safe integer.`);
      }
    }
  }
  function assertSafeInteger2(value, operation) {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`${operation} cannot be represented safely.`);
    }
    return value;
  }
  function floorDiv(value, divisor) {
    return Math.floor(value / divisor);
  }
  function modulo(value, divisor) {
    return (value % divisor + divisor) % divisor;
  }
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  function daysBeforeYear(year) {
    const previousYear = assertSafeInteger2(year - 1, "year calculation");
    return assertSafeInteger2(
      365 * previousYear + floorDiv(previousYear, 4) - floorDiv(previousYear, 100) + floorDiv(previousYear, 400),
      "year calculation"
    );
  }
  function daysBeforeMonth(year, month) {
    return CUMULATIVE_DAYS_BEFORE_MONTH[month] + (month > 2 && isLeapYear(year) ? 1 : 0);
  }
  function dateFromOrdinal(ordinal) {
    const firstSupportedDay = daysBeforeYear(MIN_YEAR);
    const firstUnsupportedDay = daysBeforeYear(MAX_YEAR + 1);
    if (ordinal < firstSupportedDay || ordinal >= firstUnsupportedDay) {
      throw new RangeError(`Normalized year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
    }
    let lowerYear = MIN_YEAR;
    let upperYear = MAX_YEAR;
    while (lowerYear < upperYear) {
      const middleYear = Math.ceil((lowerYear + upperYear) / 2);
      if (daysBeforeYear(middleYear) <= ordinal) {
        lowerYear = middleYear;
      } else {
        upperYear = middleYear - 1;
      }
    }
    const year = lowerYear;
    let dayOfYear = ordinal - daysBeforeYear(year);
    let month = 1;
    while (month < 12) {
      const nextMonthStart = daysBeforeMonth(year, month + 1);
      if (dayOfYear < nextMonthStart) {
        break;
      }
      month += 1;
    }
    return { year, month, day: dayOfYear - daysBeforeMonth(year, month) + 1 };
  }

  // src/chronicle/calendar/advance-chronicle-date-time.ts
  function advanceChronicleDateTime(dateTime, elapsedTime) {
    const normalizedElapsedTime = createElapsedTime(elapsedTime);
    return normalizeGregorianDateTime({
      year: dateTime.year,
      month: dateTime.month,
      day: safeAdd(dateTime.day, normalizedElapsedTime.days, "day"),
      hour: safeAdd(dateTime.hour, normalizedElapsedTime.hours, "hour"),
      minute: safeAdd(dateTime.minute, normalizedElapsedTime.minutes, "minute"),
      second: safeAdd(dateTime.second, normalizedElapsedTime.seconds, "second")
    });
  }
  function safeAdd(left, right, component) {
    const result = left + right;
    if (!Number.isSafeInteger(result)) {
      throw new RangeError(`${component} advance cannot be represented safely.`);
    }
    return result;
  }

  // src/chronicle/reasoning/temporal-mode.ts
  var TEMPORAL_MODES = [
    "model-signaled",
    "explicit-duration",
    "explicit-transition",
    "scene-progression",
    "summary-or-time-skip",
    "conservative-fallback"
  ];
  function isTemporalMode(value) {
    return typeof value === "string" && TEMPORAL_MODES.includes(value);
  }

  // src/chronicle/reasoning/temporal-signal-status.ts
  var TEMPORAL_SIGNAL_STATUSES = [
    "accepted",
    "absent",
    "rejected-malformed",
    "rejected-contradicted"
  ];
  function isTemporalSignalStatus(value) {
    return typeof value === "string" && TEMPORAL_SIGNAL_STATUSES.includes(value);
  }
  function assertTemporalSignalStatus(value) {
    if (!isTemporalSignalStatus(value)) {
      throw new RangeError(`Unsupported temporal signal status: ${String(value)}.`);
    }
  }

  // src/chronicle/ledger/temporal-ledger.ts
  var TEMPORAL_LEDGER_SCHEMA_VERSION = 1;
  var MAX_TEMPORAL_LEDGER_RECORDS = 100;
  var TEMPORAL_CONFIDENCE_LEVELS = ["high", "medium", "low"];
  function createTemporalLedger() {
    return Object.freeze({ records: Object.freeze([]) });
  }
  function createTemporalLedgerRecord(input) {
    const beatId2 = requireText(input.beatId, "beatId", 128);
    const actionInterpretation = requireText(input.actionInterpretation, "actionInterpretation", 280);
    const reasoning = requireText(input.reasoning, "reasoning", 500);
    assertTemporalConfidence(input.confidence);
    if (input.signalStatus !== void 0) assertTemporalSignalStatus(input.signalStatus);
    const expectedDateTime = advanceChronicleDateTime(input.previousState.currentDateTime, input.elapsedTime);
    if (!sameDateTime(expectedDateTime, input.resultingState.currentDateTime)) {
      throw new RangeError("resultingState must equal previousState plus elapsedTime.");
    }
    return Object.freeze({
      schemaVersion: TEMPORAL_LEDGER_SCHEMA_VERSION,
      beatId: beatId2,
      previousState: snapshot(input.previousState),
      actionInterpretation,
      elapsedTime: Object.freeze({ ...input.elapsedTime }),
      mode: input.mode,
      reasoning,
      confidence: input.confidence,
      resultingState: snapshot(input.resultingState),
      signalStatus: input.signalStatus
    });
  }
  function appendTemporalLedger(ledger, record) {
    if (ledger.records.some((existingRecord) => existingRecord.beatId === record.beatId)) {
      return ledger;
    }
    return Object.freeze({
      records: Object.freeze([...ledger.records, record].slice(-MAX_TEMPORAL_LEDGER_RECORDS))
    });
  }
  function isTemporalConfidence(value) {
    return typeof value === "string" && TEMPORAL_CONFIDENCE_LEVELS.includes(value);
  }
  function isTemporalLedger(value, expectedCurrentDateTime) {
    if (value === null || typeof value !== "object" || !Array.isArray(value.records)) return false;
    const records = value.records;
    if (records.length > MAX_TEMPORAL_LEDGER_RECORDS || !records.every(isTemporalLedgerRecord)) return false;
    if (new Set(records.map((record) => record.beatId)).size !== records.length) return false;
    if (records.some((record, index) => index > 0 && !sameDateTime(records[index - 1].resultingState.currentDateTime, record.previousState.currentDateTime))) return false;
    return expectedCurrentDateTime === void 0 || records.length === 0 || sameDateTime(records[records.length - 1].resultingState.currentDateTime, expectedCurrentDateTime);
  }
  function isTemporalLedgerRecord(value) {
    var _a, _b;
    if (value === null || typeof value !== "object") return false;
    const record = value;
    return record.schemaVersion === TEMPORAL_LEDGER_SCHEMA_VERSION && isText(record.beatId, 128) && isText(record.actionInterpretation, 280) && isText(record.reasoning, 500) && isTemporalConfidence(record.confidence) && isTemporalMode(record.mode) && (record.signalStatus === void 0 || isTemporalSignalStatus(record.signalStatus)) && isDateTime((_a = record.previousState) == null ? void 0 : _a.currentDateTime) && isDateTime((_b = record.resultingState) == null ? void 0 : _b.currentDateTime) && isElapsedTime(record.elapsedTime) && sameDateTime(advanceChronicleDateTime(record.previousState.currentDateTime, record.elapsedTime), record.resultingState.currentDateTime);
  }
  function isDateTime(value) {
    return isNormalizedGregorianDateTime(value);
  }
  function isElapsedTime(value) {
    if (value === null || typeof value !== "object" || Object.keys(value).length !== 4) return false;
    try {
      const normalized = createElapsedTime(value);
      return normalized.days === value.days && normalized.hours === value.hours && normalized.minutes === value.minutes && normalized.seconds === value.seconds;
    } catch (e) {
      return false;
    }
  }
  function isText(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
  }
  function assertTemporalConfidence(value) {
    if (!isTemporalConfidence(value)) {
      throw new RangeError(`Unsupported temporal confidence: ${String(value)}.`);
    }
  }
  function snapshot(state2) {
    return Object.freeze({ currentDateTime: Object.freeze({ ...state2.currentDateTime }) });
  }
  function sameDateTime(left, right) {
    return left.year === right.year && left.month === right.month && left.day === right.day && left.hour === right.hour && left.minute === right.minute && left.second === right.second;
  }
  function requireText(value, name, maxLength) {
    const text2 = value.trim();
    if (text2.length === 0 || text2.length > maxLength) {
      throw new RangeError(`${name} must contain 1 to ${maxLength} characters.`);
    }
    return text2;
  }

  // src/chronicle/state/apply-temporal-decision.ts
  var MAX_PROCESSED_BEAT_IDS = 64;
  function applyTemporalDecision(state2, beatId2, decision2) {
    const normalizedBeatId = beatId2.trim();
    if (normalizedBeatId.length === 0) {
      throw new RangeError("beatId must contain non-whitespace text.");
    }
    if (state2.processedBeatIds.includes(normalizedBeatId)) {
      return Object.freeze({ state: state2, applied: false, rejectionReason: "duplicate-beat" });
    }
    let advancedDateTime;
    try {
      advancedDateTime = advanceChronicleDateTime(state2.currentDateTime, decision2.elapsedTime);
    } catch (e) {
      return Object.freeze({ state: state2, applied: false, rejectionReason: "unsupported-range" });
    }
    const processedBeatIds = Object.freeze(
      [...state2.processedBeatIds, normalizedBeatId].slice(-MAX_PROCESSED_BEAT_IDS)
    );
    const nextState = Object.freeze({
      currentDateTime: advancedDateTime,
      processedBeatIds
    });
    return Object.freeze({ state: nextState, applied: true });
  }

  // src/chronicle/ledger/record-temporal-decision.ts
  function recordTemporalDecision(input) {
    const application = applyTemporalDecision(input.state, input.beatId, input.decision);
    if (!application.applied) {
      return Object.freeze({ state: input.state, ledger: input.ledger, record: void 0, applied: false, rejectionReason: application.rejectionReason });
    }
    if (isZeroElapsedTime(input.decision.elapsedTime) && input.decision.hasTemporalEvidence !== true) {
      return Object.freeze({ state: application.state, ledger: input.ledger, record: void 0, applied: true });
    }
    const record = createTemporalLedgerRecord({
      beatId: input.beatId,
      previousState: input.state,
      actionInterpretation: input.actionInterpretation,
      elapsedTime: input.decision.elapsedTime,
      mode: input.decision.mode,
      reasoning: input.decision.rationale,
      confidence: input.confidence,
      resultingState: application.state,
      signalStatus: input.decision.signalStatus
    });
    return Object.freeze({
      state: application.state,
      ledger: appendTemporalLedger(input.ledger, record),
      record,
      applied: true
    });
  }

  // src/chronicle/reasoning/rule-based-temporal-reasoner.ts
  var ruleBasedTemporalReasoner = Object.freeze({ decide });
  function decide(input) {
    const narrative = input.completedNarrative.toLowerCase();
    if (hasNonCurrentTemporalFrame(narrative)) {
      return decision(createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }), "conservative-fallback", "Temporal language belongs to a descriptive, remembered, hypothetical, or quoted frame.", "low");
    }
    const explicit = findExplicitDuration(narrative);
    if (explicit !== void 0) return decision(explicit, "explicit-duration", "Explicit elapsed duration in completed narrative.", "high", true);
    const transitionHour = findTransitionHour(narrative);
    if (transitionHour !== void 0) {
      return decision(untilHour(input.currentState.currentDateTime, transitionHour), "explicit-transition", "Completed narrative establishes a named time-of-day transition.", "medium");
    }
    if (/(durante a noite|throughout the night|passou a noite|overnight)/.test(narrative)) {
      return decision(createElapsedTime({ days: 0, hours: 8, minutes: 0, seconds: 0 }), "summary-or-time-skip", "Completed narrative summarizes an overnight passage.", "medium");
    }
    if (/(mais tarde|later|depois de um tempo|after a while)/.test(narrative)) {
      return decision(createElapsedTime({ days: 0, hours: 0, minutes: 5, seconds: 0 }), "conservative-fallback", "Narrative gives a vague later-time expression.", "low");
    }
    const prior = input.activityPriors.find((candidate) => candidate.requiresContext !== true && matchesActivity(narrative, candidate.activity));
    if (prior !== void 0) return decision(prior.suggestedElapsedTime, "scene-progression", "Activity prior used only because stronger temporal evidence is absent.", "low");
    if (/\b(?:correu|walked|ran|atravessando|travelling|traveled)\b/.test(narrative)) {
      return decision(createElapsedTime({ days: 0, hours: 0, minutes: 1, seconds: 0 }), "scene-progression", "Completed narrative shows a continuing physical scene, not completed travel.", "low");
    }
    return decision(createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }), "conservative-fallback", "No defensible elapsed-time evidence in the completed narrative.", "low");
  }
  var HAD_INTERVENING_ADVERBS = "already|never|just|finally|once|recently|previously|always|barely|hardly|long";
  var HAD_IRREGULAR_PARTICIPLES = "been|gone|done|seen|known|come|left|taken|given|found|told|said|held|felt|thought|brought|caught|taught|fought|sought|written|spoken|broken|chosen|stolen|frozen|grown|blown|drawn|worn|torn|born|spent|built|sent|meant|kept|slept|swept|dealt|lost|made|met|paid|read|run|shown|stood|won|begun|risen|fallen|forgotten|hidden|ridden|sworn";
  var REPORTED_SPEECH_PATTERN = /\b(?:told|tells|said|says|explained|explains|mentioned|mentions|claimed|claims|reported|reports|recalled|recalls)\s+(?:you|him|her|them|me|us)?\s*that\b/;
  function hasNonCurrentTemporalFrame(text2) {
    return /\b(?:painting|portrait|mural|photograph|photo)\b/.test(text2) || /\b(?:remembers?|remembered|remembering|recalled|recalling|imagines?|imagined|imagining|dreams?|dreamed|dreaming|nightmare|plans?|planned|planning|intends?|intended|intending|might)\b/.test(text2) || /\b(?:would|could)\s+have\b(?!\s+to\b)/.test(text2) || new RegExp(`\\bhad\\s+(?:(?:${HAD_INTERVENING_ADVERBS})\\s+)?(?:${HAD_IRREGULAR_PARTICIPLES}|\\w+ed)\\b`).test(text2) || /\b(?:seems?|seemed|appears?|appeared)\s+to\s+(?:disappear|fade|blur|dissolve|melt away)\b|\b(?:the world|everything)\s+(?:fades?|blurs?|dissolves?)\s+away\b/.test(text2) || /\b(?:lembra|lembrou|imagina|imaginou|sonha|sonhou|pesadelo|planeja|planejou|pretende)\b/.test(text2) || /^\s*(?:if|se)\b/.test(text2) || /\b(?:says|said|tells|told|replies|replied|whispers|whispered|reads|diz|disse|conta|responde|sussurra)\b[^.\n]*["“”]/.test(text2) || REPORTED_SPEECH_PATTERN.test(text2);
  }
  function matchesActivity(text2, activity) {
    const escaped = activity.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}(?:s|es|ed|ing)?\\b`).test(text2);
  }
  function findExplicitDuration(text2) {
    var _a, _b;
    const match = /(?:(?:after|for|during|over|within|depois de|após|durante|por)\s+)(\d+)\s*(segundos?|seconds?|minutos?|minutes?|horas?|hours?|dias?|days?)|(\d+)\s*(segundos?|seconds?|minutos?|minutes?|horas?|hours?|dias?|days?)\s*(?:later|passed|passaram)/.exec(text2);
    if (match === null) return void 0;
    const value = Number((_a = match[1]) != null ? _a : match[3]);
    const unit = (_b = match[2]) != null ? _b : match[4];
    if (/^(segundos?|seconds?)$/.test(unit)) return createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: value });
    if (/^(minutos?|minutes?)$/.test(unit)) return createElapsedTime({ days: 0, hours: 0, minutes: value, seconds: 0 });
    if (/^(horas?|hours?)$/.test(unit)) return createElapsedTime({ days: 0, hours: value, minutes: 0, seconds: 0 });
    return createElapsedTime({ days: value, hours: 0, minutes: 0, seconds: 0 });
  }
  function findTransitionHour(text2) {
    if (/(ao amanhecer|raios de sol|despertou|at sunrise|by sunrise|woke up|morning came)/.test(text2)) return 6;
    if (/(at noon|by noon|meio-dia|midday arrived)/.test(text2)) return 12;
    if (/(at sunset|by sunset|ao entardecer|sunset (?:came|fell|arrived))/.test(text2)) return 18;
    if (/(at nightfall|night fell|ao anoitecer|nightfall came)/.test(text2)) return 21;
    return void 0;
  }
  function untilHour(dateTime, targetHour) {
    const now = dateTime.hour * 3600 + dateTime.minute * 60 + dateTime.second;
    const target = targetHour * 3600;
    const remaining = now <= target ? target - now : 86400 - now + target;
    return createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: remaining });
  }
  function decision(elapsedTime, mode, rationale, confidence, hasTemporalEvidence = elapsedTime.days !== 0 || elapsedTime.hours !== 0 || elapsedTime.minutes !== 0 || elapsedTime.seconds !== 0) {
    return Object.freeze({ elapsedTime, mode, rationale, confidence, hasTemporalEvidence });
  }

  // src/chronicle/reasoning/model-temporal-signal.ts
  var MODEL_TEMPORAL_SIGNAL_KEY = "chronicle";
  var DEFAULT_MODEL_SIGNAL_CONFIDENCE = "medium";
  var DURATION_PATTERN = /^P(?:(\d{1,4})W)?(?:(\d{1,4})D)?(?:T(?:(\d{1,3})H)?(?:(\d{1,3})M)?(?:(\d{1,3})S)?)?$/i;
  var LENIENT_DURATION_PATTERN = /^(?:(\d{1,4})w)?(?:(\d{1,4})d)?(?:(\d{1,3})h)?(?:(\d{1,3})m)?(?:(\d{1,3})s)?$/i;
  var CONFIDENCE_TOKENS = ["high", "medium", "low"];
  function directivePattern() {
    return /<<chronicle:([^>]{1,60})>>/g;
  }
  function findAllDirectives(narrative) {
    const pattern = directivePattern();
    const values = [];
    let match;
    while ((match = pattern.exec(narrative)) !== null) {
      values.push(match[1].replace(/\s+/g, ""));
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
    return values;
  }
  function readModelTemporalSignal(narrative) {
    const matches = findAllDirectives(narrative);
    if (matches.length === 0) return Object.freeze({ status: "rejected", reason: "absent" });
    const [rawValue, rawConfidence] = matches[matches.length - 1].split(",");
    const confidence = parseConfidence(rawConfidence);
    if (rawConfidence !== void 0 && confidence === void 0) {
      return Object.freeze({ status: "rejected", reason: "malformed" });
    }
    if (/^none$/i.test(rawValue)) {
      return Object.freeze({
        status: "accepted",
        elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }),
        confidence: confidence != null ? confidence : DEFAULT_MODEL_SIGNAL_CONFIDENCE
      });
    }
    const parsed = parseDuration(rawValue);
    if (parsed === void 0) return Object.freeze({ status: "rejected", reason: "malformed" });
    return Object.freeze({
      status: "accepted",
      elapsedTime: createElapsedTime(parsed),
      confidence: confidence != null ? confidence : DEFAULT_MODEL_SIGNAL_CONFIDENCE
    });
  }
  function parseDuration(rawValue) {
    const strict = DURATION_PATTERN.exec(rawValue);
    if (strict !== null && [strict[1], strict[2], strict[3], strict[4], strict[5]].some((group) => group !== void 0)) {
      return componentsFrom(strict);
    }
    const lenient = LENIENT_DURATION_PATTERN.exec(rawValue);
    if (lenient !== null && [lenient[1], lenient[2], lenient[3], lenient[4], lenient[5]].some((group) => group !== void 0)) {
      return componentsFrom(lenient);
    }
    return void 0;
  }
  function componentsFrom(match) {
    var _a, _b, _c, _d, _e;
    const weeks = Number((_a = match[1]) != null ? _a : 0);
    const days = Number((_b = match[2]) != null ? _b : 0);
    return {
      days: weeks * 7 + days,
      hours: Number((_c = match[3]) != null ? _c : 0),
      minutes: Number((_d = match[4]) != null ? _d : 0),
      seconds: Number((_e = match[5]) != null ? _e : 0)
    };
  }
  function parseConfidence(raw) {
    if (raw === void 0) return void 0;
    const normalized = raw.toLowerCase();
    return CONFIDENCE_TOKENS.includes(normalized) ? normalized : void 0;
  }
  function stripModelTemporalSignal(narrative) {
    if (!directivePattern().test(narrative)) return narrative;
    return narrative.replace(directivePattern(), "").replace(/[ \t]{2,}/g, " ").trim();
  }

  // src/chronicle/reasoning/hybrid-temporal-reasoner.ts
  var MAX_RATIONALE_LENGTH = 280;
  function createHybridTemporalReasoner(fallback) {
    return Object.freeze({
      decide(input) {
        const signal = readModelTemporalSignal(input.completedNarrative);
        if (signal.status === "accepted") {
          if (hasNonCurrentTemporalFrame(input.completedNarrative.toLowerCase())) {
            return withRejectionNote(fallback.decide(input), "rejected-contradicted", "contradicts non-current narrative frame");
          }
          return Object.freeze({
            elapsedTime: signal.elapsedTime,
            mode: "model-signaled",
            rationale: `Model-reported elapsed time via injected directive (self-rated ${signal.confidence} confidence); consistent with local guard.`,
            confidence: signal.confidence,
            hasTemporalEvidence: true,
            signalStatus: "accepted"
          });
        }
        if (signal.reason === "absent") return Object.freeze({ ...fallback.decide(input), signalStatus: "absent" });
        return withRejectionNote(fallback.decide(input), "rejected-malformed", signal.reason);
      }
    });
  }
  function withRejectionNote(decision2, status, reason) {
    const rationale = `Model signal rejected (${reason}); ${decision2.rationale}`.slice(0, MAX_RATIONALE_LENGTH).trim();
    return Object.freeze({ ...decision2, rationale: rationale.length > 0 ? rationale : decision2.rationale, signalStatus: status });
  }

  // src/chronicle/reasoning/activity-prior.ts
  function createActivityPrior(input) {
    const activity = input.activity.trim();
    if (activity.length === 0) {
      throw new RangeError("activity must contain non-whitespace text.");
    }
    return Object.freeze({
      activity,
      suggestedElapsedTime: createElapsedTime(input.suggestedElapsedTime),
      requiresContext: input.requiresContext
    });
  }

  // src/chronicle/reasoning/activity-prior-catalog.ts
  var entries = [
    // --- movement ---
    ...["walk", "stroll", "cross the room", "go upstairs", "go downstairs", "enter", "leave", "open the door"].map((activity) => ({ activity, category: "movement", minutes: 2 })),
    ...["run", "jog", "climb", "swim", "ride", "drive", "row a boat"].map((activity) => ({ activity, category: "movement", minutes: 5 })),
    ...["step outside", "step inside", "wade across a stream", "crawl through a tunnel", "squeeze through a gap", "duck through a doorway"].map((activity) => ({ activity, category: "movement", minutes: 2 })),
    // --- routine / self-care ---
    ...["wash", "shower", "bathe", "dress", "change clothes", "brush teeth", "make breakfast", "cook", "eat", "clean", "do laundry", "shop"].map((activity) => ({ activity, category: "routine", minutes: 10 })),
    ...["comb your hair", "shave", "tie your shoes", "put on armor", "take off armor"].map((activity) => ({ activity, category: "routine", minutes: 5 })),
    ...["groom yourself", "braid hair", "polish boots"].map((activity) => ({ activity, category: "routine", minutes: 10 })),
    // --- household chores ---
    ...["sweep the floor", "mop the floor", "dust the shelves", "wash the dishes", "fold the laundry", "make the bed", "tidy the room", "feed the fire", "chop kindling"].map((activity) => ({ activity, category: "chores", minutes: 10 })),
    ...["scrub the floor", "mend a fence"].map((activity) => ({ activity, category: "chores", minutes: 15 })),
    // --- food & dining ---
    ...["pour a drink", "serve a meal", "set the table"].map((activity) => ({ activity, category: "food", minutes: 5 })),
    ...["prepare a meal", "bake bread", "brew tea"].map((activity) => ({ activity, category: "food", minutes: 15 })),
    ...["roast meat over a fire"].map((activity) => ({ activity, category: "food", minutes: 20 })),
    ...["cook a feast"].map((activity) => ({ activity, category: "food", minutes: 90 })),
    // --- social ---
    ...["talk", "chat", "argue", "negotiate", "flirt", "meet", "say goodbye", "listen"].map((activity) => ({ activity, category: "social", minutes: 5 })),
    ...["introduce yourself", "apologize", "thank someone", "compliment", "gossip"].map((activity) => ({ activity, category: "social", minutes: 5 })),
    ...["have a conversation", "console", "comfort", "interrogate"].map((activity) => ({ activity, category: "social", minutes: 15 })),
    // --- exploration & investigation ---
    ...["search", "inspect", "investigate", "scout", "patrol", "look around", "explore a room", "read a letter"].map((activity) => ({ activity, category: "exploration", minutes: 10 })),
    ...["peek through a window", "peer around a corner", "listen at a door"].map((activity) => ({ activity, category: "exploration", minutes: 5 })),
    ...["search a room thoroughly", "examine a body", "study a map", "search for clues"].map((activity) => ({ activity, category: "exploration", minutes: 15 })),
    // --- combat preparation (the fight itself stays requiresContext, below) ---
    ...["draw a weapon", "sheath a weapon", "nock an arrow", "don a helmet", "raise a shield", "take aim"].map((activity) => ({ activity, category: "combat", minutes: 2 })),
    ...["sharpen a blade", "string a bow"].map((activity) => ({ activity, category: "combat", minutes: 5 })),
    // --- crafting & skill ---
    ...["pack supplies", "organize inventory", "craft", "repair", "train", "practice", "study", "read", "write"].map((activity) => ({ activity, category: "adventure", minutes: 15 })),
    ...["sew a garment", "carve a figure", "sketch a drawing", "paint a picture", "compose a song", "tune an instrument"].map((activity) => ({ activity, category: "crafting", minutes: 15 })),
    ...["brew a potion", "enchant an item"].map((activity) => ({ activity, category: "crafting", minutes: 30 })),
    ...["forge a blade"].map((activity) => ({ activity, category: "crafting", minutes: 60 })),
    // --- rest & recovery ---
    ...["rest", "sit down", "wait", "meditate"].map((activity) => ({ activity, category: "rest", minutes: 5 })),
    ...["catch your breath", "take a break", "stretch"].map((activity) => ({ activity, category: "rest", minutes: 5 })),
    ...["doze off"].map((activity) => ({ activity, category: "rest", minutes: 10 })),
    ...["rest by the fire"].map((activity) => ({ activity, category: "rest", minutes: 60 })),
    // --- travel preparation (the journey itself stays requiresContext, below) ---
    ...["saddle a horse", "unsaddle a horse", "load the wagon", "moor the ship", "board a ship", "disembark"].map((activity) => ({ activity, category: "travel", minutes: 5 })),
    ...["check the map"].map((activity) => ({ activity, category: "travel", minutes: 10 })),
    // --- commerce & shopping ---
    ...["haggle", "pay for goods", "browse a stall"].map((activity) => ({ activity, category: "commerce", minutes: 5 })),
    ...["shop for supplies", "visit the market", "buy provisions"].map((activity) => ({ activity, category: "commerce", minutes: 15 })),
    // --- animal care ---
    ...["feed the horse", "groom the horse", "milk a cow", "muck the stable", "tend the animals", "water the livestock"].map((activity) => ({ activity, category: "animal-care", minutes: 10 })),
    // --- performance & entertainment ---
    ...["sing a song", "tell a joke", "play a tune"].map((activity) => ({ activity, category: "performance", minutes: 5 })),
    ...["perform a dance", "tell a story", "recite a poem"].map((activity) => ({ activity, category: "performance", minutes: 15 })),
    // --- medical & first aid (non-magical; the broader "heal" stays requiresContext, below) ---
    ...["bandage a wound", "apply a poultice", "clean a wound"].map((activity) => ({ activity, category: "medical", minutes: 5 })),
    ...["tend to the wounded", "stitch a wound"].map((activity) => ({ activity, category: "medical", minutes: 15 })),
    // --- magic (small, bounded acts; the full "ritual" stays requiresContext, below) ---
    ...["cast a spell", "light a candle", "chant a phrase"].map((activity) => ({ activity, category: "magic", minutes: 2 })),
    ...["prepare a spell", "inscribe a scroll"].map((activity) => ({ activity, category: "magic", minutes: 10 })),
    // --- stealth & subterfuge ---
    ...["sneak", "hide", "tiptoe", "eavesdrop"].map((activity) => ({ activity, category: "stealth", minutes: 2 })),
    ...["pick a lock", "pick a pocket", "disguise yourself"].map((activity) => ({ activity, category: "stealth", minutes: 10 })),
    // --- nature & survival ---
    ...["forage for food", "gather herbs", "collect firewood", "start a fire", "set a trap"].map((activity) => ({ activity, category: "survival", minutes: 10 })),
    ...["set up camp", "break camp"].map((activity) => ({ activity, category: "survival", minutes: 15 })),
    ...["build a shelter"].map((activity) => ({ activity, category: "survival", minutes: 30 })),
    // --- worship ---
    ...["pray", "give an offering", "light incense"].map((activity) => ({ activity, category: "worship", minutes: 5 })),
    ...["attend a ceremony"].map((activity) => ({ activity, category: "worship", minutes: 20 })),
    // --- learning & knowledge ---
    ...["do research", "decipher a text", "review your notes"].map((activity) => ({ activity, category: "learning", minutes: 15 })),
    ...["study a tome"].map((activity) => ({ activity, category: "learning", minutes: 30 })),
    // --- activities whose real duration is too context-dependent for any single
    //     default (kept excluded from DEFAULT_ACTIVITY_PRIORS below, exactly like
    //     the original set) ---
    ...["travel", "journey", "hike", "march", "sail", "fight", "battle", "sleep", "nap", "ritual", "heal"].map((activity) => ({ activity, category: "adventure", minutes: 0, requiresContext: true })),
    ...["hunt", "fish"].map((activity) => ({ activity, category: "survival", minutes: 0, requiresContext: true }))
  ];
  var ACTIVITY_PRIOR_CATALOG = Object.freeze(entries.map((entry) => Object.freeze({
    ...createActivityPrior({ activity: entry.activity, suggestedElapsedTime: { days: 0, hours: 0, minutes: entry.minutes, seconds: 0 }, requiresContext: entry.requiresContext }),
    category: entry.category
  })));
  var DEFAULT_ACTIVITY_PRIORS = Object.freeze(
    ACTIVITY_PRIOR_CATALOG.filter((entry) => entry.requiresContext !== true)
  );

  // src/chronicle/state/format-chronicle-date-time.ts
  function formatChronicleDateTime(dateTime) {
    return [pad(dateTime.year, 4), pad(dateTime.month), pad(dateTime.day)].join("/") + ` ${pad(dateTime.hour)}:${pad(dateTime.minute)}:${pad(dateTime.second)}`;
  }
  function pad(value, width = 2) {
    return value.toString().padStart(width, "0");
  }

  // src/chronicle/state/format-chronicle-time-of-day.ts
  function formatChronicleTimeOfDay(dateTime) {
    if (dateTime.hour < 5) return "late night";
    if (dateTime.hour < 9) return "early morning";
    if (dateTime.hour < 12) return "morning";
    if (dateTime.hour < 18) return "afternoon";
    if (dateTime.hour < 21) return "evening";
    return "night";
  }

  // src/chronicle/state/render-chronicle-temporal-context.ts
  function renderChronicleTemporalContext(dateTime) {
    return `[Chronicle]
Current story time: ${formatChronicleDateTime(dateTime)}.
Time of day: ${formatChronicleTimeOfDay(dateTime)}.`;
  }

  // src/aidungeon/story-cards/chronicle-story-card.ts
  var CHRONICLE_STORY_CARD_KEY = "chronicle-temporal-state";
  var CHRONICLE_STORY_CARD_TYPE = "story";
  var MAX_STORY_CARD_LEDGER_RECORDS = 20;
  function renderChronicleStoryCardEntry(state2) {
    return renderChronicleTemporalContext(state2.currentDateTime);
  }
  function renderChronicleStoryCardNotes(ledger) {
    const records = ledger.records.slice(-MAX_STORY_CARD_LEDGER_RECORDS).map(renderLedgerRecord);
    return JSON.stringify(
      {
        chronicleTemporalLedger: {
          schemaVersion: 1,
          records
        }
      },
      null,
      2
    );
  }
  function createChronicleStoryCardProjection(state2, ledger) {
    return Object.freeze({
      keys: CHRONICLE_STORY_CARD_KEY,
      entry: renderChronicleStoryCardEntry(state2),
      type: CHRONICLE_STORY_CARD_TYPE,
      notes: renderChronicleStoryCardNotes(ledger)
    });
  }
  function findChronicleStoryCardIndex(storyCards2) {
    return findChronicleStoryCardIndices(storyCards2)[0];
  }
  function findChronicleStoryCardIndices(storyCards2) {
    const indices = [];
    storyCards2.forEach((card, index) => {
      if (card.keys.split(",").map((key) => key.trim()).includes(CHRONICLE_STORY_CARD_KEY)) indices.push(index);
    });
    return Object.freeze(indices);
  }
  function renderLedgerRecord(record) {
    return {
      beatId: record.beatId,
      before: formatChronicleDateTime(record.previousState.currentDateTime),
      interpretation: record.actionInterpretation,
      elapsedTime: record.elapsedTime,
      mode: record.mode,
      signalStatus: record.signalStatus,
      reasoning: record.reasoning,
      confidence: record.confidence,
      after: formatChronicleDateTime(record.resultingState.currentDateTime)
    };
  }

  // src/aidungeon/story-cards/sync-chronicle-story-card.ts
  function syncChronicleStoryCard(runtime, state2, ledger, options = {}) {
    const projection = createChronicleStoryCardProjection(state2, ledger);
    const matchingIndices = findChronicleStoryCardIndices(runtime.storyCards);
    const existingIndex = matchingIndices[0];
    if (matchingIndices.length > 1 && options.repairDuplicates === true) {
      if (runtime.removeStoryCard === void 0) {
        return Object.freeze({ status: "duplicate-detected", cardIndex: existingIndex, notesWriteAttempted: false, duplicateCount: matchingIndices.length });
      }
      for (const index of matchingIndices.slice(1).reverse()) runtime.removeStoryCard(index);
      runtime.updateStoryCard(existingIndex, projection.keys, projection.entry, projection.type);
      writeExperimentalNotes(runtime.storyCards[existingIndex], projection.notes);
      return Object.freeze({ status: "repaired", cardIndex: existingIndex, notesWriteAttempted: true, duplicateCount: matchingIndices.length });
    }
    if (existingIndex !== void 0) {
      runtime.updateStoryCard(existingIndex, projection.keys, projection.entry, projection.type);
      writeExperimentalNotes(runtime.storyCards[existingIndex], projection.notes);
      return Object.freeze({ status: matchingIndices.length > 1 ? "duplicate-detected" : "updated", cardIndex: existingIndex, notesWriteAttempted: true, duplicateCount: matchingIndices.length });
    }
    const createdIndex = runtime.addStoryCard(projection.keys, projection.entry, projection.type);
    if (createdIndex !== false && runtime.storyCards[createdIndex] !== void 0) {
      writeExperimentalNotes(runtime.storyCards[createdIndex], projection.notes);
      return Object.freeze({ status: "created", cardIndex: createdIndex, notesWriteAttempted: true, duplicateCount: 1 });
    }
    const recoveredIndex = findChronicleStoryCardIndex(runtime.storyCards);
    if (recoveredIndex === void 0) {
      throw new Error("Chronicle Story Card could not be created or recovered.");
    }
    runtime.updateStoryCard(recoveredIndex, projection.keys, projection.entry, projection.type);
    writeExperimentalNotes(runtime.storyCards[recoveredIndex], projection.notes);
    return Object.freeze({ status: "recovered", cardIndex: recoveredIndex, notesWriteAttempted: true, duplicateCount: 1 });
  }
  function writeExperimentalNotes(card, notes) {
    card.description = notes;
  }

  // src/aidungeon/story-cards/chronicle-configuration.ts
  var CHRONICLE_CONFIGURATION_KEY = "chronicle-configuration";
  function readChronicleConfiguration(cards, currentDateTime) {
    var _a, _b, _c, _d, _e;
    const card = cards.find((candidate) => candidate.keys.split(",").map((key) => key.trim()).includes(CHRONICLE_CONFIGURATION_KEY));
    if (card === void 0) return Object.freeze({ enabled: false, mode: "automatic", repairChronicleCard: false, aiTemporalSignal: true });
    const values = parseLines((_a = card.description) != null ? _a : "");
    const enabled2 = ((_b = values["chronicle enabled"]) != null ? _b : "true").toLowerCase() === "true";
    const mode = ((_c = values["initialization mode"]) != null ? _c : "automatic").toLowerCase() === "manual" ? "manual" : "automatic";
    const repairChronicleCard = ((_d = values["repair chronicle card"]) != null ? _d : "false").toLowerCase() === "true";
    const aiTemporalSignal = ((_e = values["ai temporal signal"]) != null ? _e : "true").toLowerCase() === "true";
    const manual = mode === "manual" ? readManualDateTime(values, currentDateTime != null ? currentDateTime : runtimeDateTime()) : void 0;
    return Object.freeze({ enabled: enabled2, mode, initialDateTime: manual == null ? void 0 : manual.initialDateTime, repairChronicleCard, aiTemporalSignal, error: manual == null ? void 0 : manual.error });
  }
  function runtimeDateTime(now = /* @__PURE__ */ new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    }).formatToParts(now);
    const value = (type) => {
      var _a;
      return Number((_a = parts.find((part) => part.type === type)) == null ? void 0 : _a.value);
    };
    return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
  }
  function parseLines(notes) {
    const values = {};
    for (const line of notes.split(/\r?\n/)) {
      const separator = line.indexOf(":");
      if (separator > 0) values[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
    }
    return values;
  }
  function readManualDateTime(values, currentDateTime) {
    const fields = [
      ["start year", "year"],
      ["start month", "month"],
      ["start day", "day"],
      ["start hour", "hour"],
      ["start minute", "minute"],
      ["start second", "second"]
    ];
    const input = { ...currentDateTime };
    for (const [field, component] of fields) {
      const raw = values[field];
      if (raw === void 0 || raw === "") continue;
      const parsed = Number(raw);
      if (!Number.isSafeInteger(parsed)) {
        return Object.freeze({ error: `Manual Chronicle configuration has an invalid ${field} value.` });
      }
      input[component] = parsed;
    }
    return Object.freeze({ initialDateTime: Object.freeze(input) });
  }

  // src/chronicle/state/initialize-chronicle-state.ts
  function initializeChronicleState(input) {
    return Object.freeze({
      currentDateTime: normalizeGregorianDateTime(input),
      processedBeatIds: Object.freeze([])
    });
  }

  // src/aidungeon/chronicle-time-notification.ts
  var CHRONICLE_NOTIFICATION_STATE_KEY = "chronicleNotificationMessage";
  function renderChronicleTimeNotification(previous, next) {
    const nextPeriod = formatChronicleTimeOfDay(next);
    if (formatChronicleTimeOfDay(previous) === nextPeriod) return void 0;
    const presentation = periodPresentation(nextPeriod);
    return `${presentation.icon} Chronicle \u2014 ${presentation.label}
Story time: ${formatChronicleDateTime(next)}.`;
  }
  function periodPresentation(period) {
    switch (period) {
      case "late night":
        return { icon: "\u{1F319}", label: "Late night" };
      case "early morning":
        return { icon: "\u{1F305}", label: "Dawn" };
      case "morning":
        return { icon: "\u2600\uFE0F", label: "Morning" };
      case "afternoon":
        return { icon: "\u{1F324}\uFE0F", label: "Afternoon" };
      case "evening":
        return { icon: "\u{1F306}", label: "Evening" };
      case "night":
        return { icon: "\u{1F319}", label: "Nightfall" };
      default:
        return { icon: "\u231B", label: "Time passes" };
    }
  }

  // src/aidungeon/runtime.ts
  var CHRONICLE_RUNTIME_STATE_KEY = "chronicleRuntime";
  var CHRONICLE_RUNTIME_ERROR_KEY = "chronicleRuntimeError";
  var CHRONICLE_RUNTIME_SCHEMA_VERSION = 1;
  function nonEmptyText(text2) {
    return text2 === "" ? "\u200B" : text2;
  }
  function initializeChronicleRuntime(state2, chronicleState) {
    state2[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ schemaVersion: CHRONICLE_RUNTIME_SCHEMA_VERSION, chronicleState, ledger: createTemporalLedger(), pendingPlayerAction: void 0 });
    delete state2[CHRONICLE_RUNTIME_ERROR_KEY];
  }
  function createChronicleRuntime(reasoner) {
    const hybridReasoner = reasoner === void 0 ? void 0 : createHybridTemporalReasoner(reasoner);
    return Object.freeze({
      onInput(text2, context) {
        clearChronicleNotification(context.state);
        syncSignalInstructionForContext(context);
        if (!enabled(context)) return nonEmptyText(text2);
        const current = ensureInitialized(context);
        if (current !== void 0) context.state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ ...current, pendingPlayerAction: text2 });
        return nonEmptyText(text2);
      },
      onContext(text2, context) {
        syncSignalInstructionForContext(context);
        if (!enabled(context)) return nonEmptyText(text2);
        const current = ensureInitialized(context);
        if (current === void 0) return nonEmptyText(text2);
        try {
          syncProjection(context, current, false);
        } catch (error) {
          context.state[CHRONICLE_RUNTIME_ERROR_KEY] = `Chronicle Story Card sync failed unexpectedly (${error instanceof Error ? error.message : String(error)}). Canonical time is unaffected.`;
        }
        const projection = renderChronicleTemporalContext(current.chronicleState.currentDateTime);
        if (context.maxChars !== void 0 && !text2.includes(projection) && text2.length + projection.length + 1 > context.maxChars) return nonEmptyText(text2);
        return nonEmptyText(text2.includes(projection) ? text2 : `${projection}
${text2}`);
      },
      onOutput(text2, context) {
        var _a, _b, _c;
        clearChronicleNotification(context.state);
        syncSignalInstructionForContext(context);
        const safeText = stripModelTemporalSignal(text2);
        if (!enabled(context)) return nonEmptyText(safeText);
        const current = ensureInitialized(context);
        if (current === void 0 || reasoner === void 0) return nonEmptyText(safeText);
        try {
          const configuration = readChronicleConfiguration((_b = (_a = context.storyCards) == null ? void 0 : _a.storyCards) != null ? _b : []);
          const activeReasoner = configuration.aiTemporalSignal ? hybridReasoner != null ? hybridReasoner : reasoner : reasoner;
          const decision2 = activeReasoner.decide({ currentState: current.chronicleState, playerAction: current.pendingPlayerAction, completedNarrative: text2, activityPriors: DEFAULT_ACTIVITY_PRIORS });
          const recorded = recordTemporalDecision({ state: current.chronicleState, ledger: current.ledger, beatId: beatId(context.actionCount, text2), decision: decision2, actionInterpretation: decision2.rationale, confidence: (_c = decision2.confidence) != null ? _c : "low" });
          if (recorded.rejectionReason === "unsupported-range") {
            context.state[CHRONICLE_RUNTIME_ERROR_KEY] = UNSUPPORTED_RANGE_ERROR;
          } else if (context.state[CHRONICLE_RUNTIME_ERROR_KEY] === UNSUPPORTED_RANGE_ERROR) {
            delete context.state[CHRONICLE_RUNTIME_ERROR_KEY];
          }
          context.state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ schemaVersion: CHRONICLE_RUNTIME_SCHEMA_VERSION, chronicleState: recorded.state, ledger: recorded.ledger, pendingPlayerAction: void 0 });
          const notification = renderChronicleTimeNotification(current.chronicleState.currentDateTime, recorded.state.currentDateTime);
          if (notification !== void 0) setChronicleNotification(context.state, notification);
          syncProjection(context, { ...current, chronicleState: recorded.state, ledger: recorded.ledger, pendingPlayerAction: void 0 }, true);
        } catch (error) {
          context.state[CHRONICLE_RUNTIME_ERROR_KEY] = `Chronicle paused: unexpected error evaluating the completed beat (${error instanceof Error ? error.message : String(error)}).`;
        }
        return nonEmptyText(safeText);
      }
    });
  }
  var CHRONICLE_SIGNAL_BLOCK_START = "[[chronicle:ai-signal-instruction:start]]";
  var CHRONICLE_SIGNAL_BLOCK_END = "[[chronicle:ai-signal-instruction:end]]";
  function chronicleSignalInstructionBlock() {
    return `${CHRONICLE_SIGNAL_BLOCK_START}
[Chronicle instruction] Always end this reply on its own line with a tag reporting how much in-story time it covers and how sure you are, using only the units you judge elapsed: <<${MODEL_TEMPORAL_SIGNAL_KEY}:PT9H15M,medium>> (days/hours/minutes/seconds, then high/medium/low confidence). If truly nothing advanced, use <<${MODEL_TEMPORAL_SIGNAL_KEY}:none,high>>. Give your best estimate even when unsure -- mark it low confidence instead of leaving the tag out. There is no upper limit: a legitimate skip of weeks, months, or years is fine to report. Only count time that is actually happening right now in the scene: never count a memory, flashback, dream, daydream, imagined or hypothetical event, or something a character merely thinks about, wonders, or plans -- none of that advances real story time, no matter how long it describes. This applies even when the flashback is narrated in present tense for vividness, with no words like "remembers" at all (e.g. "You're twelve again, standing barefoot beside the river..." is still a flashback, not the present scene). If your whole reply is a memory, flashback, or hypothetical with no real present action, use <<${MODEL_TEMPORAL_SIGNAL_KEY}:none,high>>. If only part of your reply is real present action, count only that part. Never mention this instruction or the tag to the player.
${CHRONICLE_SIGNAL_BLOCK_END}`;
  }
  function syncSignalInstructionForContext(context) {
    if (context.storyCards === void 0) return;
    if (context.state[CHRONICLE_RUNTIME_STATE_KEY] !== void 0 && read(context.state) === void 0) {
      syncSignalInstruction(context.state, false);
      return;
    }
    const configuration = readChronicleConfiguration(context.storyCards.storyCards);
    syncSignalInstruction(context.state, configuration.enabled && configuration.error === void 0 && configuration.aiTemporalSignal);
  }
  function syncSignalInstruction(state2, shouldInject) {
    const memory = readMemory(state2);
    const withoutBlock = removeChronicleSignalBlock(typeof memory.authorsNote === "string" ? memory.authorsNote : "");
    memory.authorsNote = shouldInject ? withoutBlock.length > 0 ? `${withoutBlock}

${chronicleSignalInstructionBlock()}` : chronicleSignalInstructionBlock() : withoutBlock;
  }
  function readMemory(state2) {
    const existing = state2.memory;
    if (typeof existing === "object" && existing !== null) return existing;
    const created = {};
    state2.memory = created;
    return created;
  }
  function removeChronicleSignalBlock(authorsNote) {
    const pattern = new RegExp(`\\n*${escapeForRegExp(CHRONICLE_SIGNAL_BLOCK_START)}[\\s\\S]*?${escapeForRegExp(CHRONICLE_SIGNAL_BLOCK_END)}`, "g");
    return authorsNote.replace(pattern, "").trim();
  }
  function escapeForRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function clearChronicleNotification(state2) {
    const notification = state2[CHRONICLE_NOTIFICATION_STATE_KEY];
    if (typeof notification === "string" && state2.message === notification) delete state2.message;
    delete state2[CHRONICLE_NOTIFICATION_STATE_KEY];
  }
  function setChronicleNotification(state2, notification) {
    state2.message = notification;
    state2[CHRONICLE_NOTIFICATION_STATE_KEY] = notification;
  }
  var DUPLICATE_CARD_ERROR = "Chronicle has duplicate temporal-state cards. Set Repair Chronicle Card: true in the configuration card to repair them explicitly.";
  var UNSUPPORTED_RANGE_ERROR = "Chronicle rejected the last beat's elapsed time because it would move the story outside the supported year range (0001-9999). Canonical time was not changed.";
  function syncProjection(context, current, force) {
    if (context.storyCards === void 0) return;
    const configuration = readChronicleConfiguration(context.storyCards.storyCards);
    const matchingCards = findChronicleStoryCardIndices(context.storyCards.storyCards);
    if (!force && configuration.repairChronicleCard !== true && matchingCards.length < 2) return;
    const sync = syncChronicleStoryCard(context.storyCards, current.chronicleState, current.ledger, { repairDuplicates: configuration.repairChronicleCard });
    if (sync.status === "duplicate-detected") {
      context.state[CHRONICLE_RUNTIME_ERROR_KEY] = DUPLICATE_CARD_ERROR;
    } else if (context.state[CHRONICLE_RUNTIME_ERROR_KEY] === DUPLICATE_CARD_ERROR) {
      delete context.state[CHRONICLE_RUNTIME_ERROR_KEY];
    }
  }
  var passthroughRuntime = createChronicleRuntime();
  function read(state2) {
    const value = state2[CHRONICLE_RUNTIME_STATE_KEY];
    if (value === void 0) return void 0;
    if (!isValidRuntimeState(value)) return void 0;
    return value;
  }
  function enabled(context) {
    return context.storyCards !== void 0 && readChronicleConfiguration(context.storyCards.storyCards).enabled;
  }
  function ensureInitialized(context) {
    var _a;
    const existing = read(context.state);
    if (existing !== void 0) return existing;
    if (context.state[CHRONICLE_RUNTIME_STATE_KEY] !== void 0) {
      context.state[CHRONICLE_RUNTIME_ERROR_KEY] = "Chronicle paused: persisted runtime state is invalid or incompatible.";
      return void 0;
    }
    if (context.storyCards === void 0) return void 0;
    const configuration = readChronicleConfiguration(context.storyCards.storyCards);
    if (!configuration.enabled) return void 0;
    if (configuration.error !== void 0) {
      context.state[CHRONICLE_RUNTIME_ERROR_KEY] = `Chronicle paused: ${configuration.error}`;
      return void 0;
    }
    initializeChronicleRuntime(context.state, initializeChronicleState((_a = configuration.initialDateTime) != null ? _a : runtimeDateTime()));
    return read(context.state);
  }
  function isValidRuntimeState(value) {
    var _a, _b;
    if (value === null || typeof value !== "object") return false;
    const candidate = value;
    const dateTime = (_a = candidate.chronicleState) == null ? void 0 : _a.currentDateTime;
    return candidate.schemaVersion === CHRONICLE_RUNTIME_SCHEMA_VERSION && dateTime !== void 0 && isNormalizedGregorianDateTime(dateTime) && Array.isArray((_b = candidate.chronicleState) == null ? void 0 : _b.processedBeatIds) && candidate.chronicleState.processedBeatIds.length <= MAX_PROCESSED_BEAT_IDS && candidate.chronicleState.processedBeatIds.every((id) => typeof id === "string" && id.trim().length > 0) && new Set(candidate.chronicleState.processedBeatIds).size === candidate.chronicleState.processedBeatIds.length && isTemporalLedger(candidate.ledger, dateTime) && (candidate.pendingPlayerAction === void 0 || typeof candidate.pendingPlayerAction === "string");
  }
  function beatId(actionCount, text2) {
    let hash = 2166136261;
    for (let index = 0; index < text2.length; index += 1) hash = Math.imul(hash ^ text2.charCodeAt(index), 16777619);
    return `${actionCount != null ? actionCount : "unknown"}:${(hash >>> 0).toString(16)}`;
  }

  // src/aidungeon/input.ts
  var modifier = (value) => {
    var _a, _b;
    return {
      text: (_b = (_a = globalThis.ChronicleAIDungeon) == null ? void 0 : _a.onInput(value, { state, actionCount: info.actionCount, storyCards: { storyCards, addStoryCard, updateStoryCard, removeStoryCard: typeof removeStoryCard === "function" ? removeStoryCard : void 0 } })) != null ? _b : nonEmptyText(value)
    };
  };
  modifier(text);
})();
