import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateBiometricAgeFromFeatures, calculateGtaWantedStars } from './argusApi';
import { enrichRussianDatabases, formatNoPersonResponse } from '../server/geminiService';

test('estimateBiometricAgeFromFeatures classifies adolescent profile as biologically minor', () => {
  const result = estimateBiometricAgeFromFeatures(0.28, 0.92, 127, false);
  assert.equal(result.isBiologicallyMinor, true);
  assert.ok(result.estimatedAge >= 14 && result.estimatedAge < 18);
  assert.equal(result.facialMorphologyMarkers.length, 4);
});

test('estimateBiometricAgeFromFeatures classifies mature profile with facial hair as adult', () => {
  const result = estimateBiometricAgeFromFeatures(0.24, 0.75, 118, true);
  assert.equal(result.isBiologicallyMinor, false);
  assert.equal(result.ageGroup, 'adult');
  assert.ok(result.estimatedAge >= 18);
});

test('enrichRussianDatabases returns structured Safe City database records', () => {
  const dbs = enrichRussianDatabases('Соколов Артём Игоревич', '14.05.2010', 15, true, true, 'male');
  assert.ok(Array.isArray(dbs.databases));
  assert.equal(dbs.databases.length, 1);
  assert.equal(dbs.databases[0].id, 'db_argus');
  assert.equal(dbs.databases[0].matched, true);
});

test('formatNoPersonResponse explicitly marks personDetected as false and reports no person in frame', () => {
  const res = formatNoPersonResponse(2);
  assert.equal(res.personDetected, false);
  assert.equal(res.isSmokingOrVaping, false);
  assert.equal(res.isHoldingAlcohol, false);
  assert.equal(res.alcoholLabelRu, 'Человек в кадре не обнаружен');
  assert.equal(res.deviceLabelRu, 'Человек в кадре не обнаружен');
  assert.equal(res.ageEstimation.ageRangeString, 'Человек не обнаружен');
  assert.equal(res.safeCityBiometrics.fullName, 'Человек в кадре не обнаружен');
  assert.equal(res.detectedObjects.length, 0);
});

test('calculateGtaWantedStars computes 0, 1, 2, 3, and 5 wanted stars accurately', () => {
  assert.equal(calculateGtaWantedStars(null), 0);
  const noPerson = formatNoPersonResponse(0);
  assert.equal(calculateGtaWantedStars(noPerson), 0);

  const base = {
    ...noPerson,
    personDetected: true,
    ageEstimation: { ...noPerson.ageEstimation, isBiologicallyMinor: false },
  };
  assert.equal(calculateGtaWantedStars(base), 0);
  assert.equal(calculateGtaWantedStars({ ...base, isSmokingOrVaping: true }), 1);
  assert.equal(calculateGtaWantedStars({ ...base, isSmokingOrVaping: true, isHoldingAlcohol: true }), 2);

  const minorBase = {
    ...base,
    ageEstimation: { ...base.ageEstimation, isBiologicallyMinor: true },
  };
  assert.equal(calculateGtaWantedStars({ ...minorBase, isSmokingOrVaping: true }), 3);
  assert.equal(calculateGtaWantedStars({ ...minorBase, isSmokingOrVaping: true, isHoldingAlcohol: true }), 5);
});

