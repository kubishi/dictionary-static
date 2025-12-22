<template>
  <div class="container">
    <div class="pronunciation-page">
      <h1>Pronunciation Guide</h1>
      
      <div class="card">
        <h2>Kubishi (Owens Valley Paiute) Pronunciation</h2>
        <p>
          Kubishi is the native language of the Owens Valley Paiute people. 
          This guide provides an overview of the sounds and orthography used in this dictionary.
        </p>
      </div>

      <div class="card">
        <h3>Vowels</h3>
        <p>Kubishi has both short and long vowels:</p>
        <ul>
          <li><strong>a</strong> - like 'a' in "father"</li>
          <li><strong>e</strong> - like 'e' in "bet"</li>
          <li><strong>i</strong> - like 'i' in "machine"</li>
          <li><strong>o</strong> - like 'o' in "note"</li>
          <li><strong>u</strong> - like 'oo' in "boot"</li>
          <li><strong>ü</strong> - like 'u' in "flute" (high central vowel)</li>
        </ul>
        <p class="note">Long vowels are marked with double letters (aa, ee, ii, oo, uu) or macrons (ā, ē, ī, ō, ū).</p>
      </div>

      <div class="card">
        <h3>Consonants</h3>
        <p>Most consonants are pronounced similarly to English, with these notable exceptions:</p>
        <ul>
          <li><strong>h</strong> - aspirated, stronger than English 'h'</li>
          <li><strong>kw</strong> - like 'qu' in "queen"</li>
          <li><strong>ts</strong> - like 'ts' in "cats"</li>
          <li><strong>'</strong> (glottal stop) - a catch in the throat, like between syllables in "uh-oh"</li>
        </ul>
      </div>

      <div class="card">
        <h3>Stress and Tone</h3>
        <p>
          Stress generally falls on the first syllable of a word. Pay attention to vowel length, 
          as it can change the meaning of words.
        </p>
      </div>

      <div class="card">
        <h3>Notes on Orthography</h3>
        <p>
          This dictionary follows the orthographic conventions established by Glenn Nelson Jr. 
          in the <em>Owens Valley Paiute Dictionary</em>. Different writing systems may use 
          different symbols for the same sounds.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Pronunciation'
}
</script>

<style scoped>
.pronunciation-page h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.pronunciation-page h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.pronunciation-page h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.pronunciation-page p {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

.pronunciation-page ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
  color: var(--text-secondary);
}

.pronunciation-page li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.note {
  font-style: italic;
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-top: 1rem;
}
</style>
