"use strict";
// Type definitions for onboarding enums
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformCycleLengthEnumToNumber = transformCycleLengthEnumToNumber;
exports.transformPeriodDurationEnumToNumber = transformPeriodDurationEnumToNumber;
exports.calculateAgeFromDateOfBirth = calculateAgeFromDateOfBirth;
// Helper functions for data transformation
function transformCycleLengthEnumToNumber(cycleLength) {
    if (!cycleLength)
        return 28; // default
    const mapping = {
        'less_than_21': 20,
        '21_24': 23,
        '25_30': 28,
        '31_35': 33,
        'longer_than_35': 36,
        'irregular': 28,
    };
    return mapping[cycleLength] || 28;
}
function transformPeriodDurationEnumToNumber(periodDuration) {
    if (!periodDuration)
        return 5; // default
    const mapping = {
        '1_3': 2,
        '4_6': 5,
        '7_plus': 7,
    };
    return mapping[periodDuration] || 5;
}
function calculateAgeFromDateOfBirth(dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
