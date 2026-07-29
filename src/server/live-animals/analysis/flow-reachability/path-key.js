export const stripIndices = (key) => key.replace(/\[\d+\]/g, '')

// The obligation name a pathKey ends on (its leaf segment, indices stripped).
export const leafName = (key) => stripIndices(key).split('.').pop()
