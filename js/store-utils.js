// store-utils.js
export function normalizePhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('52') ? cleaned : '52' + cleaned;
}