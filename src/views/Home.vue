<template>
  <div class="home">
    <div class="container">
      <div class="home-layout">
        <!-- Sidebar for desktop -->
        <aside class="sidebar" v-if="wordOfDay">
          <div class="word-of-day card">
            <h3>Word of the Day</h3>
            <div class="wod-content" @click="$router.push(getWordUrl(wordOfDay))">
              <h2>{{ getPrimaryForm(wordOfDay) }}</h2>
              <p class="definition">{{ getFirstDefinition(wordOfDay) }}</p>
              <span v-if="wordOfDay.senses?.[0]?.partOfSpeech" class="pos">
                {{ wordOfDay.senses[0].partOfSpeech }}
              </span>
            </div>
          </div>

          
          <div class="stats" v-if="index">
            <div class="stat-item">
              <div class="stat-number">{{ index.totalWords }}</div>
              <div class="stat-label">Words</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ index.totalSentences }}</div>
              <div class="stat-label">Example Sentences</div>
            </div>
          </div>
        </aside>

        <!-- Main content area -->
        <main class="main-content">
          <div class="search-section">
            <div class="search-box">
              <input 
                type="search" 
                v-model="searchQuery"
                @input="handleSearch"
                placeholder="Search for words or meanings..."
                class="search-input"
              />
            </div>
          </div>

          <div v-if="loading" class="loading">
            <div class="spinner"></div>
          </div>

          <div v-else-if="searchQuery && results.length === 0" class="no-results">
            <p>No results found for "{{ searchQuery }}"</p>
          </div>

          <div v-else-if="results.length > 0" class="results">
            <h3>{{ results.length }} result{{ results.length !== 1 ? 's' : '' }}</h3>
            <div 
              v-for="word in results" 
              :key="word.id"
              class="result-card card"
              @click="$router.push(getWordUrl(word))"
            >
              <h4>{{ getPrimaryForm(word) }}</h4>
              <div v-if="word.senses && word.senses.length > 0">
                <p class="definition">{{ getFirstDefinition(word) }}</p>
                <span v-if="word.senses[0].partOfSpeech" class="pos">
                  {{ word.senses[0].partOfSpeech }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="results.length === 0" class="acknowledgement card">
            <h3 class="text-center">Acknowledgements</h3>
            <p>
              All words and sentences in this dictionary are from Glenn Nelson Jr.'s 
              <em>Owens Valley Paiute Dictionary</em>. This website is made possible through 
              his work and the contributions of the native speakers and elders he collaborated with.
            </p>
            <p>
              Special thanks to Norma Nelson, elder and fluent speaker/teacher of the Bishop Paiute Tribe, 
              as well as to the following Paiute speakers from across Payahuunadü: 
              Albert Meredith, Ethie Meredith, Andy Garrison, Maude Shaw, Ruth Brown, and Margie Jones.
            </p>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { loadData, getWords, getIndex, getWordOfTheDay, getWordUrl } from '../services/data'
import { smartSearch } from '../services/smart-search'

export default {
  name: 'Home',
  setup() {
    const wordOfDay = ref(null)
    const searchQuery = ref('')
    const results = ref([])
    const loading = ref(false)
    const index = ref(null)
    let searchTimeout = null

    onMounted(async () => {
      loading.value = true
      console.log('📖 Loading dictionary data...')
      try {
        await loadData()
        index.value = getIndex()
        wordOfDay.value = getWordOfTheDay()
        console.log(`✅ Loaded ${index.value.totalWords} words and ${index.value.totalSentences} sentences`)
      } catch (error) {
        console.error('❌ Error loading data:', error)
      } finally {
        loading.value = false
      }
    })

    const handleSearch = () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }

      searchTimeout = setTimeout(async () => {
        if (!searchQuery.value.trim()) {
          results.value = []
          return
        }

        loading.value = true
        console.log(`🔍 Searching for "${searchQuery.value}"...`)
        
        try {
          const searchResults = smartSearch(searchQuery.value, 20)
          
          // Map to full word objects
          const words = getWords()
          results.value = searchResults
            .filter(r => r.type === 'word')
            .map(r => words.find(w => w.id === r.id))
            .filter(Boolean)
          
          console.log(`Found ${results.value.length} results`)
        } catch (error) {
          console.error('❌ Search error:', error)
        } finally {
          loading.value = false
        }
      }, 300) // Debounce
    }

    const getPrimaryForm = (word) => {
      return word.forms ? Object.values(word.forms)[0] : word.word || 'Unknown'
    }

    const getFirstDefinition = (word) => {
      if (!word.senses || word.senses.length === 0) return ''
      
      const sense = word.senses[0]
      if (sense.definitions && Object.keys(sense.definitions).length > 0) {
        return Object.values(sense.definitions)[0]
      }
      if (sense.glosses && Object.keys(sense.glosses).length > 0) {
        return Object.values(sense.glosses)[0]
      }
      return ''
    }

    return {
      searchQuery,
      results,
      loading,
      index,
      wordOfDay,
      handleSearch,
      getWordUrl,
      getPrimaryForm,
      getFirstDefinition
    }
  }
}
</script>

<style scoped>
.home-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
}

.sidebar {
  position: sticky;
  top: 1rem;
}

.main-content {
  min-width: 0;
}

@media (max-width: 968px) {
  .home-layout {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    position: static;
    order: 2;
  }
  
  .main-content {
    order: 1;
  }
}

.search-section {
  margin-bottom: 2rem;
}

.search-section h2 {
  margin-bottom: 1rem;
  font-size: 1.75rem;
  color: var(--text-primary);
}

.search-box {
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  font-size: 1.1rem;
  padding: 1rem;
}

.results {
  margin-top: 2rem;
}

.results h3 {
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-size: 1.1rem;
  font-weight: 500;
}

.result-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.result-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow);
}

.result-card h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 1.25rem;
}

.definition {
  margin: 0.5rem 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.pos {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin-top: 0.5rem;
}

.welcome {
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
}

.word-of-day {
  text-align: center;
}

.word-of-day h3 {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.wod-content {
  cursor: pointer;
  transition: transform 0.2s;
}

.wod-content:hover {
  transform: scale(1.02);
}

.wod-content h2 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  color: var(--accent-primary);
  font-weight: 600;
  word-break: break-word;
}

.wod-content .definition {
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

@media (max-width: 968px) {
  .sidebar {
    margin-bottom: 1.5rem;
  }
  
  .word-of-day h3 {
    font-size: 1rem;
  }
  
  .wod-content h2 {
    font-size: 2rem;
  }
  
  .wod-content .definition {
    font-size: 1.1rem;
  }
}

.welcome h2 {
  margin-bottom: 1rem;
  font-size: 2rem;
  color: var(--text-primary);
}

.intro {
  font-size: 1.1rem;
  margin-bottom: 2rem;
  color: var(--text-secondary);
}

.intro a {
  color: var(--accent-primary);
  text-decoration: underline;
}

.stats {
  margin: 2rem 0;
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--accent-primary);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.acknowledgement {
  margin-top: 1rem;
  text-align: left;
}

.acknowledgement h3 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.acknowledgement p {
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}
</style>
