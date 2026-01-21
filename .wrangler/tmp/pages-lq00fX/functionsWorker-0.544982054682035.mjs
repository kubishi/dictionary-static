var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/_shared.js
var wordsCache = null;
var sentencesCache = null;
var embeddingsCache = null;
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders
    }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}
__name(errorResponse, "errorResponse");
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
__name(handleOptions, "handleOptions");
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}
__name(fetchJson, "fetchJson");
async function loadWords(baseUrl) {
  if (!wordsCache) {
    wordsCache = await fetchJson(`${baseUrl}/data/words.json`);
  }
  return wordsCache;
}
__name(loadWords, "loadWords");
async function loadSentences(baseUrl) {
  if (!sentencesCache) {
    sentencesCache = await fetchJson(`${baseUrl}/data/sentences.json`);
  }
  return sentencesCache;
}
__name(loadSentences, "loadSentences");
async function loadEmbeddings(baseUrl) {
  if (!embeddingsCache) {
    embeddingsCache = await fetchJson(`${baseUrl}/data/embeddings.json`);
  }
  return embeddingsCache;
}
__name(loadEmbeddings, "loadEmbeddings");
function normalizeForMatching(text) {
  return text.toLowerCase().replace(/[kg]/g, "k").replace(/[td]/g, "t").replace(/[sz]/g, "s").replace(/[üu]/g, "u").replace(/w̃/g, "w").replace(/[mw]/g, "m").replace(/[pb]/g, "p");
}
__name(normalizeForMatching, "normalizeForMatching");
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}
__name(levenshteinDistance, "levenshteinDistance");
function wordToApiFormat(word) {
  const primaryForm = word.forms ? Object.values(word.forms)[0] : "";
  return {
    id: word.id,
    lexical_unit: primaryForm,
    word: primaryForm,
    dateCreated: word.dateCreated || null,
    dateModified: word.dateModified || null,
    traits: word.morphType ? { "morph-type": word.morphType } : {},
    senses: (word.senses || []).map((sense) => ({
      id: sense.id || null,
      grammatical_info: sense.partOfSpeech || null,
      gloss: sense.glosses ? Object.values(sense.glosses)[0] : null,
      definition: sense.definitions ? Object.values(sense.definitions)[0] : null,
      examples: (sense.examples || []).map((ex) => ({
        form: ex.forms ? Object.values(ex.forms)[0] : "",
        translation: ex.translations ? Object.values(ex.translations)[0] : "",
        source: ex.source || null,
        note: ex.note || null
      }))
    }))
  };
}
__name(wordToApiFormat, "wordToApiFormat");
function sentenceToApiFormat(sentence) {
  return {
    text: sentence.forms ? Object.values(sentence.forms)[0] : "",
    translation: sentence.translations ? Object.values(sentence.translations)[0] : "",
    word_ids: sentence.wordIds || [],
    source: sentence.source || null
  };
}
__name(sentenceToApiFormat, "sentenceToApiFormat");
function searchPaiuteWords(words, query, limit = 10, skip = 0) {
  const normalizedQuery = normalizeForMatching(query);
  const maxDistance = Math.max(1, Math.floor(query.length / 4));
  const scored = words.map((word) => {
    const primaryForm = word.forms ? Object.values(word.forms)[0] : "";
    const normalizedForm = normalizeForMatching(primaryForm);
    let score = 0;
    if (normalizedForm === normalizedQuery) {
      score = 1e3;
    } else if (normalizedForm.startsWith(normalizedQuery)) {
      score = 900 - (normalizedForm.length - normalizedQuery.length);
    } else if (normalizedForm.includes(normalizedQuery)) {
      score = 700 - normalizedForm.indexOf(normalizedQuery) * 2;
    } else if (normalizedQuery.length >= 3) {
      const wordStart = normalizedForm.substring(0, normalizedQuery.length);
      const distance = levenshteinDistance(normalizedQuery, wordStart);
      if (distance <= maxDistance) {
        score = 500 - distance * 50;
      }
    }
    if (score === 0 && normalizedQuery.length >= 4) {
      const distance = levenshteinDistance(normalizedQuery, normalizedForm);
      if (distance <= maxDistance) {
        score = 300 - distance * 30;
      }
    }
    return { word, score };
  });
  return scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(skip, skip + limit).map((item) => item.word);
}
__name(searchPaiuteWords, "searchPaiuteWords");
function isValidWord(word) {
  if (!word.senses || word.senses.length === 0) return false;
  return word.senses.some(
    (sense) => sense.glosses && Object.keys(sense.glosses).length > 0 || sense.definitions && Object.keys(sense.definitions).length > 0
  );
}
__name(isValidWord, "isValidWord");
function getFirstLetter(text) {
  const match2 = text.match(/[a-zA-Z]/);
  return match2 ? match2[0].toUpperCase() : "#";
}
__name(getFirstLetter, "getFirstLetter");

// api/word/[id].js
async function onRequestOptions() {
  return handleOptions();
}
__name(onRequestOptions, "onRequestOptions");
async function onRequestGet(context) {
  const { id } = context.params;
  if (!id) {
    return errorResponse("Word ID is required", 400);
  }
  try {
    const url = new URL(context.request.url);
    const baseUrl = url.origin;
    const words = await loadWords(baseUrl);
    const numericId = parseInt(id, 10);
    const word = words.find((w) => w.id === id || w.id === numericId);
    if (!word) {
      return errorResponse("Word not found", 404);
    }
    return jsonResponse({
      word: wordToApiFormat(word),
      audio: null
      // No audio support in static version
    });
  } catch (error) {
    console.error("Error fetching word:", error);
    return errorResponse("Failed to fetch word", 500);
  }
}
__name(onRequestGet, "onRequestGet");

// api/browse.js
async function onRequestOptions2() {
  return handleOptions();
}
__name(onRequestOptions2, "onRequestOptions");
async function onRequestGet2(context) {
  const url = new URL(context.request.url);
  const letter = url.searchParams.get("letter");
  const counts = url.searchParams.get("counts");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  try {
    const baseUrl = url.origin;
    const words = await loadWords(baseUrl);
    const validWords = words.filter(isValidWord);
    if (counts === "true") {
      const letterCounts = {};
      for (const word of validWords) {
        const primaryForm = word.forms ? Object.values(word.forms)[0] : "";
        const firstLetter = getFirstLetter(primaryForm);
        letterCounts[firstLetter] = (letterCounts[firstLetter] || 0) + 1;
      }
      const sortedCounts = Object.entries(letterCounts).map(([letter2, count]) => ({ letter: letter2, count })).sort((a, b) => a.letter.localeCompare(b.letter));
      return jsonResponse(
        { letterCounts: sortedCounts },
        200,
        { "Cache-Control": "public, max-age=3600" }
      );
    }
    let filteredWords = validWords;
    if (letter) {
      filteredWords = validWords.filter((word) => {
        const primaryForm = word.forms ? Object.values(word.forms)[0] : "";
        return getFirstLetter(primaryForm) === letter.toUpperCase();
      });
    }
    filteredWords.sort((a, b) => {
      const aForm = (a.forms ? Object.values(a.forms)[0] : "").toLowerCase();
      const bForm = (b.forms ? Object.values(b.forms)[0] : "").toLowerCase();
      return aForm.localeCompare(bForm);
    });
    const results = filteredWords.slice(skip, skip + limit).map(wordToApiFormat);
    return jsonResponse({
      results,
      pagination: { letter: letter || null, limit, skip }
    });
  } catch (error) {
    console.error("Browse error:", error);
    return errorResponse("Browse failed", 500);
  }
}
__name(onRequestGet2, "onRequestGet");

// api/docs.js
async function onRequestOptions3() {
  return handleOptions();
}
__name(onRequestOptions3, "onRequestOptions");
async function onRequestGet3(context) {
  const url = new URL(context.request.url);
  const format = url.searchParams.get("format");
  if (format === "json") {
    return Response.redirect(`${url.origin}/openapi.json`, 302);
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kubishi Dictionary API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"><\/script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '${url.origin}/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  <\/script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      ...corsHeaders
    }
  });
}
__name(onRequestGet3, "onRequestGet");

// api/random-sentence.js
async function onRequestOptions4() {
  return handleOptions();
}
__name(onRequestOptions4, "onRequestOptions");
async function onRequestGet4(context) {
  try {
    const url = new URL(context.request.url);
    const baseUrl = url.origin;
    const sentences = await loadSentences(baseUrl);
    if (sentences.length === 0) {
      return errorResponse("No sentences found", 404);
    }
    const randomIndex = Math.floor(Math.random() * sentences.length);
    const sentence = sentences[randomIndex];
    return jsonResponse({
      sentence: sentenceToApiFormat(sentence)
    });
  } catch (error) {
    console.error("Error fetching random sentence:", error);
    return errorResponse("Failed to fetch random sentence", 500);
  }
}
__name(onRequestGet4, "onRequestGet");

// api/random-word.js
async function onRequestOptions5() {
  return handleOptions();
}
__name(onRequestOptions5, "onRequestOptions");
async function onRequestGet5(context) {
  try {
    const url = new URL(context.request.url);
    const baseUrl = url.origin;
    const words = await loadWords(baseUrl);
    const validWords = words.filter(isValidWord);
    if (validWords.length === 0) {
      return errorResponse("No words found", 404);
    }
    const randomIndex = Math.floor(Math.random() * validWords.length);
    const word = validWords[randomIndex];
    return jsonResponse({
      word: wordToApiFormat(word),
      audio: null
    });
  } catch (error) {
    console.error("Error fetching random word:", error);
    return errorResponse("Failed to fetch random word", 500);
  }
}
__name(onRequestGet5, "onRequestGet");

// api/search.js
async function onRequestOptions6() {
  return handleOptions();
}
__name(onRequestOptions6, "onRequestOptions");
async function onRequestGet6(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get("q");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 100);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  if (!query) {
    return errorResponse('Query parameter "q" is required', 400);
  }
  try {
    const baseUrl = url.origin;
    const [words, embeddingsData] = await Promise.all([
      loadWords(baseUrl),
      loadEmbeddings(baseUrl)
    ]);
    const validWords = words.filter(isValidWord);
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 1);
    const scored = validWords.map((word) => {
      let score = 0;
      const searchText = getSearchableText(word).toLowerCase();
      if (searchText.includes(queryLower)) {
        score += 100;
      }
      for (const term of queryTerms) {
        if (searchText.includes(term)) {
          score += 10;
          const regex = new RegExp(`\\b${term}\\b`, "i");
          if (regex.test(searchText)) {
            score += 5;
          }
        }
      }
      return { word, score };
    });
    const results = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(skip, skip + limit).map((item) => wordToApiFormat(item.word));
    return jsonResponse({
      results,
      pagination: { limit, skip }
    });
  } catch (error) {
    console.error("Search error:", error);
    return errorResponse("Search failed", 500);
  }
}
__name(onRequestGet6, "onRequestGet");
function getSearchableText(word) {
  const parts = [];
  for (const sense of word.senses || []) {
    if (sense.definitions) {
      parts.push(...Object.values(sense.definitions));
    }
    if (sense.glosses) {
      parts.push(...Object.values(sense.glosses));
    }
  }
  return parts.join(" ");
}
__name(getSearchableText, "getSearchableText");

// api/search-paiute.js
async function onRequestOptions7() {
  return handleOptions();
}
__name(onRequestOptions7, "onRequestOptions");
async function onRequestGet7(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get("q");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 100);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  if (!query) {
    return errorResponse('Query parameter "q" is required', 400);
  }
  try {
    const baseUrl = url.origin;
    const words = await loadWords(baseUrl);
    const validWords = words.filter(isValidWord);
    const results = searchPaiuteWords(validWords, query, limit, skip).map(wordToApiFormat);
    return jsonResponse({
      results,
      pagination: { limit, skip }
    });
  } catch (error) {
    console.error("Search error:", error);
    return errorResponse("Search failed", 500);
  }
}
__name(onRequestGet7, "onRequestGet");

// api/search-sentences.js
async function onRequestOptions8() {
  return handleOptions();
}
__name(onRequestOptions8, "onRequestOptions");
async function onRequestGet8(context) {
  const url = new URL(context.request.url);
  const query = url.searchParams.get("q");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 100);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  if (!query) {
    return errorResponse('Query parameter "q" is required', 400);
  }
  try {
    const baseUrl = url.origin;
    const sentences = await loadSentences(baseUrl);
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 1);
    const scored = sentences.map((sentence) => {
      let score = 0;
      const searchText = getSearchableText2(sentence).toLowerCase();
      if (searchText.includes(queryLower)) {
        score += 100;
      }
      for (const term of queryTerms) {
        if (searchText.includes(term)) {
          score += 10;
          const regex = new RegExp(`\\b${term}\\b`, "i");
          if (regex.test(searchText)) {
            score += 5;
          }
        }
      }
      return { sentence, score };
    });
    const results = scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(skip, skip + limit).map((item) => sentenceToApiFormat(item.sentence));
    return jsonResponse({
      results,
      pagination: { limit, skip }
    });
  } catch (error) {
    console.error("Search error:", error);
    return errorResponse("Search failed", 500);
  }
}
__name(onRequestGet8, "onRequestGet");
function getSearchableText2(sentence) {
  const parts = [];
  if (sentence.forms) {
    parts.push(...Object.values(sentence.forms));
  }
  if (sentence.translations) {
    parts.push(...Object.values(sentence.translations));
  }
  return parts.join(" ");
}
__name(getSearchableText2, "getSearchableText");

// api/word-of-the-day.js
async function onRequestOptions9() {
  return handleOptions();
}
__name(onRequestOptions9, "onRequestOptions");
async function onRequestGet9(context) {
  try {
    const url = new URL(context.request.url);
    const baseUrl = url.origin;
    const words = await loadWords(baseUrl);
    const validWords = words.filter(isValidWord);
    if (validWords.length === 0) {
      return errorResponse("No words found", 404);
    }
    const today = /* @__PURE__ */ new Date();
    const dayOfYear = getDayOfYear(today);
    const year = today.getFullYear();
    const wordsWithExamples = validWords.filter(
      (word2) => word2.senses?.some((sense) => sense.examples?.length > 0)
    );
    const pool = wordsWithExamples.length > 0 ? wordsWithExamples : validWords;
    const seed = year * 1e3 + dayOfYear;
    const index = seed % pool.length;
    const word = pool[index];
    return jsonResponse({
      word: wordToApiFormat(word),
      audio: null
    });
  } catch (error) {
    console.error("Error fetching word of the day:", error);
    return errorResponse("Failed to fetch word of the day", 500);
  }
}
__name(onRequestGet9, "onRequestGet");
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1e3 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
__name(getDayOfYear, "getDayOfYear");

// ../.wrangler/tmp/pages-lq00fX/functionsRoutes-0.4139384410152782.mjs
var routes = [
  {
    routePath: "/api/word/:id",
    mountPath: "/api/word",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/word/:id",
    mountPath: "/api/word",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/browse",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/browse",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/docs",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/docs",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/random-sentence",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/random-sentence",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions4]
  },
  {
    routePath: "/api/random-word",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/random-word",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions5]
  },
  {
    routePath: "/api/search",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/search",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions6]
  },
  {
    routePath: "/api/search-paiute",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/search-paiute",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions7]
  },
  {
    routePath: "/api/search-sentences",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/search-sentences",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions8]
  },
  {
    routePath: "/api/word-of-the-day",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/word-of-the-day",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions9]
  }
];

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-7BDPnt/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-7BDPnt/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.544982054682035.mjs.map
