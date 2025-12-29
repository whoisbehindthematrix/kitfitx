"use strict";
// Type definitions for onboarding enums and interfaces
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAgeFromDateOfBirth = calculateAgeFromDateOfBirth;
// ===========================================
// HELPER FUNCTIONS
// ===========================================
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
