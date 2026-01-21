import { onRequestGet as __api_word__id__js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/word/[id].js"
import { onRequestOptions as __api_word__id__js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/word/[id].js"
import { onRequestGet as __api_browse_js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/browse.js"
import { onRequestOptions as __api_browse_js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/browse.js"
import { onRequestGet as __api_docs_js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/docs.js"
import { onRequestOptions as __api_docs_js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/docs.js"
import { onRequestGet as __api_random_sentence_js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/random-sentence.js"
import { onRequestOptions as __api_random_sentence_js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/random-sentence.js"
import { onRequestGet as __api_random_word_js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/random-word.js"
import { onRequestOptions as __api_random_word_js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/random-word.js"
import { onRequestGet as __api_search_js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/search.js"
import { onRequestOptions as __api_search_js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/search.js"
import { onRequestGet as __api_search_paiute_js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/search-paiute.js"
import { onRequestOptions as __api_search_paiute_js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/search-paiute.js"
import { onRequestGet as __api_search_sentences_js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/search-sentences.js"
import { onRequestOptions as __api_search_sentences_js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/search-sentences.js"
import { onRequestGet as __api_word_of_the_day_js_onRequestGet } from "/home/jared/projects/kubishi/dictionary-static/functions/api/word-of-the-day.js"
import { onRequestOptions as __api_word_of_the_day_js_onRequestOptions } from "/home/jared/projects/kubishi/dictionary-static/functions/api/word-of-the-day.js"

export const routes = [
    {
      routePath: "/api/word/:id",
      mountPath: "/api/word",
      method: "GET",
      middlewares: [],
      modules: [__api_word__id__js_onRequestGet],
    },
  {
      routePath: "/api/word/:id",
      mountPath: "/api/word",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_word__id__js_onRequestOptions],
    },
  {
      routePath: "/api/browse",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_browse_js_onRequestGet],
    },
  {
      routePath: "/api/browse",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_browse_js_onRequestOptions],
    },
  {
      routePath: "/api/docs",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_docs_js_onRequestGet],
    },
  {
      routePath: "/api/docs",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_docs_js_onRequestOptions],
    },
  {
      routePath: "/api/random-sentence",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_random_sentence_js_onRequestGet],
    },
  {
      routePath: "/api/random-sentence",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_random_sentence_js_onRequestOptions],
    },
  {
      routePath: "/api/random-word",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_random_word_js_onRequestGet],
    },
  {
      routePath: "/api/random-word",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_random_word_js_onRequestOptions],
    },
  {
      routePath: "/api/search",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_search_js_onRequestGet],
    },
  {
      routePath: "/api/search",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_search_js_onRequestOptions],
    },
  {
      routePath: "/api/search-paiute",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_search_paiute_js_onRequestGet],
    },
  {
      routePath: "/api/search-paiute",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_search_paiute_js_onRequestOptions],
    },
  {
      routePath: "/api/search-sentences",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_search_sentences_js_onRequestGet],
    },
  {
      routePath: "/api/search-sentences",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_search_sentences_js_onRequestOptions],
    },
  {
      routePath: "/api/word-of-the-day",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_word_of_the_day_js_onRequestGet],
    },
  {
      routePath: "/api/word-of-the-day",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_word_of_the_day_js_onRequestOptions],
    },
  ]