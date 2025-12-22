<template>
  <div class="container">
    <div class="about-page">
      <h1>About</h1>
      
      <div class="card">
        <p>
          This website was created and is maintained by 
          <a href="https://jaredraycoleman.com" target="_blank" rel="noopener">Jared Coleman</a>, 
          member of the <a href="http://bigpinepaiute.org" target="_blank" rel="noopener">Big Pine Paiute Tribe of the Owens Valley</a> 
          and Assistant Professor of Computer Science at Loyola Marymount University.
        </p>
      </div>

      <div class="card">
        <h2>Credits and Acknowledgements</h2>
        <p>
          All words and sentences in this dictionary are from Glenn Nelson Jr.'s 
          <em>Owens Valley Paiute Dictionary</em>. This website is made possible through 
          his work and the contributions of the native speakers and elders he collaborated with.
        </p>
        <p>
          Special thanks to <strong>Norma Nelson</strong>, elder and fluent speaker/teacher of the Bishop Paiute Tribe, 
          as well as to the following Paiute speakers from across Payahuunadü: 
          Albert Meredith, Ethie Meredith, Andy Garrison, Maude Shaw, Ruth Brown, and Margie Jones.
        </p>
      </div>

      <div class="card">
        <h2>About This Site</h2>
        <p>
          This is a fully static dictionary website built from a .lift (Lexicon Interchange FormaT) file. 
          All data is processed at build time and embedded into the site, making it fast, reliable, 
          and requiring no backend server.
        </p>
        <h3>Features</h3>
        <ul>
          <li><strong>Smart Search:</strong> Uses TF-IDF algorithm to intelligently rank search results</li>
          <li><strong>Offline Capable:</strong> Works offline after the initial load</li>
          <li><strong>Fast:</strong> All data is pre-processed and optimized</li>
          <li><strong>No Backend:</strong> Runs entirely in your browser</li>
          <li><strong>Dark Mode:</strong> Easy on the eyes day or night</li>
        </ul>
        <h3>Technology</h3>
        <p>Built with Vue 3, Vite, and custom TF-IDF search implementation.</p>
      </div>

      <div class="card" v-if="index">
        <h2>Dictionary Statistics</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">{{ index.totalWords }}</div>
            <div class="stat-description">Words</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{{ index.totalSentences }}</div>
            <div class="stat-description">Example Sentences</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{{ index.writingSystems?.length || 0 }}</div>
            <div class="stat-description">Writing Systems</div>
          </div>
        </div>
        <p class="build-date">Last built: {{ formatDate(index.lastBuild) }}</p>
      </div>

      <div class="card">
        <h2>Contact</h2>
        <p>
          For questions, corrections, or suggestions, please contact Jared Coleman through his 
          <a href="https://jaredraycoleman.com" target="_blank" rel="noopener">website</a>.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { loadData, getIndex } from '../services/data'

export default {
  name: 'About',
  setup() {
    const index = ref(null)

    onMounted(async () => {
      try {
        await loadData()
        index.value = getIndex()
      } catch (error) {
        console.error('Error loading index:', error)
      }
    })

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString()
    }

    return {
      index,
      formatDate
    }
  }
}
</script>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
}

.about-page h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.about-page h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.about-page h3 {
  font-size: 1.25rem;
  margin: 1.5rem 0 0.75rem 0;
  color: var(--text-primary);
}

.about-page p {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

.about-page a {
  color: var(--accent-primary);
  text-decoration: underline;
}

.about-page a:hover {
  color: var(--accent-hover);
}

.about-page ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
  color: var(--text-secondary);
}

.about-page li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.stat-box {
  text-align: center;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-primary);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--accent-primary);
  margin-bottom: 0.5rem;
}

.stat-description {
  color: var(--text-muted);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.build-date {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 1rem;
}
</style>
