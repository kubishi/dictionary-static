<template>
  <div class="container">
    <div class="word-detail">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="!word" class="not-found card">
        <h2>Word Not Found</h2>
        <p>The word you're looking for doesn't exist.</p>
        <button @click="$router.back()" class="btn">← Back</button>
      </div>

      <div v-else class="word-content">
        <div class="word-header">
          <h1>{{ getPrimaryForm() }}</h1>
          
          <div v-if="word.forms && Object.keys(word.forms).length > 1" class="forms-section card">
            <h3>Alternative Forms</h3>
            <div class="form-list">
              <div v-for="(form, lang) in word.forms" :key="lang" class="form-item">
                <span class="form-text">{{ form }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="word.senses && word.senses.length > 0" class="senses-section">
          <h2>Definitions</h2>
          <div 
            v-for="(sense, index) in word.senses" 
            :key="index"
            class="sense card"
          >
            <div class="sense-header">
              <span class="sense-number">{{ index + 1 }}</span>
              <span v-if="sense.partOfSpeech" class="pos-tag">
                {{ sense.partOfSpeech }}
              </span>
            </div>

            <!-- Definitions -->
            <div v-if="sense.definitions && Object.keys(sense.definitions).length > 0" class="definitions">
              <div v-for="(def, lang) in sense.definitions" :key="lang" class="def-item">
                <span class="def-text">{{ def }}</span>
              </div>
            </div>

            <!-- Glosses -->
            <div v-if="sense.glosses && Object.keys(sense.glosses).length > 0" class="glosses">
              <div v-for="(gloss, lang) in sense.glosses" :key="lang" class="gloss-item">
                <em>{{ gloss }}</em>
              </div>
            </div>

            <!-- Grammatical category -->
            <div v-if="sense.grammaticalInfo" class="grammatical-info">
              <strong>Grammatical Info:</strong> {{ sense.grammaticalInfo }}
            </div>

            <!-- Examples -->
            <div v-if="sense.examples && sense.examples.length > 0" class="examples">
              <h4>Examples</h4>
              <div 
                v-for="(example, exIndex) in sense.examples" 
                :key="exIndex"
                class="example-box"
              >
                <!-- Example forms (the sentence itself) -->
                <div v-if="example.forms" class="example-forms">
                  <div v-for="(text, lang) in example.forms" :key="'form-' + lang" class="example-line">
                    <span class="example-text">{{ text }}</span>
                  </div>
                </div>
                
                <!-- Translations -->
                <div v-if="example.translations && Object.keys(example.translations).length > 0" class="example-translations">
                  <div v-for="(text, lang) in example.translations" :key="'trans-' + lang" class="translation-line">
                    <span class="translation-text">{{ text }}</span>
                  </div>
                </div>
                
                <!-- Source citation -->
                <div v-if="example.source" class="example-source">
                  — {{ example.source }}
                </div>
                
                <!-- Notes -->
                <div v-if="example.notes && example.notes.length > 0" class="example-notes">
                  <div v-for="(note, noteIdx) in example.notes" :key="noteIdx" class="example-note">
                    Note: {{ note }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="word.notes && word.notes.length > 0" class="notes-section card">
          <h3>Notes</h3>
          <p v-for="(note, index) in word.notes" :key="index" class="note-item">{{ note }}</p>
        </div>

        <!-- Sources / Citation Info -->
        <div v-if="word.source || word.citation" class="sources-section card">
          <h3>Sources</h3>
          <p v-if="word.source">{{ word.source }}</p>
          <p v-if="word.citation"><em>{{ word.citation }}</em></p>
        </div>

        <!-- Metadata -->
        <div class="metadata card">
          <h3>Entry Information</h3>
          <div class="meta-grid">
            <div v-if="word.id" class="meta-item">
              <strong>Entry ID:</strong> {{ word.id }}
            </div>
            <div v-if="word.guid" class="meta-item">
              <strong>GUID:</strong> <code>{{ word.guid }}</code>
            </div>
            <div v-if="word.dateCreated" class="meta-item">
              <strong>Created:</strong> {{ word.dateCreated }}
            </div>
            <div v-if="word.dateModified" class="meta-item">
              <strong>Modified:</strong> {{ word.dateModified }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import { loadData, getWordBySlugOrId, getWords, getWordUrl } from '../services/data'

export default {
  name: 'Word',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const word = ref(null)
    const loading = ref(true)

    // Computed properties for meta tags
    const pageTitle = computed(() => {
      if (!word.value) return 'Word | Kubishi Dictionary'
      const primaryForm = getPrimaryForm()
      return `${primaryForm} | Kubishi Dictionary`
    })

    const pageDescription = computed(() => {
      if (!word.value) return 'Owens Valley Paiute Dictionary'
      const primaryForm = getPrimaryForm()
      const definition = getFirstDefinition()
      return definition ? `${primaryForm}: ${definition}` : `${primaryForm} - Owens Valley Paiute word`
    })

    const pageUrl = computed(() => {
      return `https://dictionary.kubishi.com${route.fullPath}`
    })

    // Setup dynamic head tags
    useHead({
      title: pageTitle,
      meta: [
        { name: 'description', content: pageDescription },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: pageDescription },
        { property: 'og:url', content: pageUrl },
        { property: 'og:type', content: 'article' },
        { property: 'twitter:title', content: pageTitle },
        { property: 'twitter:description', content: pageDescription },
      ]
    })

    const loadWord = async () => {
      loading.value = true
      try {
        await loadData()
        word.value = getWordBySlugOrId(route.params.slugOrId)
      } catch (error) {
        console.error('Error loading word:', error)
      } finally {
        loading.value = false
      }
    }

    onMounted(loadWord)

    // Watch for route changes to load new word
    watch(() => route.params.slugOrId, (newSlugOrId) => {
      if (newSlugOrId) {
        loadWord()
      }
    })

    const getPrimaryForm = () => {
      if (!word.value) return ''
      return word.value.forms ? Object.values(word.value.forms)[0] : word.value.word || 'Unknown'
    }

    const getFirstDefinition = () => {
      if (!word.value || !word.value.senses || word.value.senses.length === 0) return ''
      const sense = word.value.senses[0]
      if (sense.definitions && Object.keys(sense.definitions).length > 0) {
        return Object.values(sense.definitions)[0]
      }
      if (sense.glosses && Object.keys(sense.glosses).length > 0) {
        return Object.values(sense.glosses)[0]
      }
      return ''
    }

    const getAnotherRandom = () => {
      const words = getWords()
      if (words.length > 0) {
        const randomWord = words[Math.floor(Math.random() * words.length)]
        router.push(getWordUrl(randomWord))
      }
    }

    return {
      word,
      loading,
      getPrimaryForm,
      getAnotherRandom
    }
  }
}
</script>

<style scoped>
.word-detail {
  max-width: 800px;
  margin: 0 auto;
}

.word-header h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 2.5rem;
  font-weight: 600;
}

.forms-section {
  margin-top: 1.5rem;
  padding: 1.5rem;
}

.forms-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 500;
}

.form-list {
  display: grid;
  gap: 0.75rem;
}

.form-item {
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--border-primary);
}

.lang-label {
  font-weight: 600;
  color: var(--text-muted);
  margin-right: 0.5rem;
}

.form-text {
  color: var(--text-primary);
  font-size: 1.1rem;
}

.senses-section {
  margin-top: 2rem;
}

.senses-section > h2 {
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 1.5rem;
}

.sense {
  margin-bottom: 1.5rem;
}

.sense-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.sense-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--accent-primary);
  color: white;
  border-radius: 50%;
  font-weight: bold;
  flex-shrink: 0;
}

.pos-tag {
  padding: 0.25rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.definitions,
.glosses {
  margin-bottom: 1rem;
}

.def-item,
.gloss-item {
  margin-bottom: 0.5rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.def-text {
  font-size: 1.05rem;
  color: var(--text-primary);
}

.grammatical-info {
  margin: 1rem 0;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.examples {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-primary);
}

.examples h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 500;
}

.example-box {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-left: 3px solid var(--accent-primary);
  border-radius: 4px;
}

.example-forms {
  margin-bottom: 0.5rem;
}

.example-line {
  margin-bottom: 0.35rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.example-text {
  color: var(--text-primary);
  font-weight: 500;
}

.example-translations {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-secondary);
}

.translation-line {
  margin-bottom: 0.25rem;
}

.translation-text {
  color: var(--text-secondary);
  font-style: italic;
}

.example-source {
  margin-top: 0.75rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-style: italic;
}

.example-notes {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-secondary);
}

.example-note {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
}

.notes-section,
.sources-section,
.metadata {
  margin-top: 2rem;
}

.notes-section h3,
.sources-section h3,
.metadata h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1.25rem;
}

.note-item {
  margin: 0.75rem 0;
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.7;
}

.sources-section p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.meta-grid {
  display: grid;
  gap: 0.75rem;
}

.meta-item {
  padding: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.meta-item strong {
  color: var(--text-primary);
  margin-right: 0.5rem;
}

.meta-item code {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  background: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
}

.actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.not-found {
  text-align: center;
  padding: 3rem;
}

.not-found h2 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.not-found p {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .word-header h1 {
    font-size: 2rem;
  }

  .actions {
    flex-direction: column;
  }

  .actions .btn {
    width: 100%;
  }
}
</style>
