<template>
  <div class="container">
    <div class="word-detail">
      <h1 style="font-size: 2rem; font-weight: 600; margin-bottom: 1.5rem;">Pronunciation Guide</h1>

      <div class="sense-section">
        <h2 class="sense-title">Vowels</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
          <div>
            <strong>a</strong> - as in English "father" <br>
            <strong>e</strong> - as in English "bet" <br>
            <strong>i</strong> - as in English "bee" <br>
          </div>
          <div>
            <strong>o</strong> - as in English "boat" <br>
            <strong>u</strong> - as in English "boot" <br>
            <strong>ü</strong> - as in English "put" but said with lips apart <br>
          </div>
        </div>
      </div>

      <div class="sense-section">
        <h2 class="sense-title">Consonants</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
          <div>
            <strong>p</strong> - as in English "pour" <br>
            <strong>t</strong> - as in English "butter" <br>
            <strong>k</strong> - as in English "kidding" <br>
            <strong>h</strong> - as in English "house" <br>
            <strong>n</strong> - as in English "banner" <br>
            <strong>w</strong> - as in English "winter" <br>
            <strong>y</strong> - as in English "yabber" <br>
            <strong>'</strong> - as stop in air output like the 'space' in the middle of the expression "uh oh" <br>
          </div>
          <div>
            <strong>b</strong> - as in English "casaba" without lips touching <br>
            <strong>d</strong> - as in English "body" <br>
            <strong>g</strong> - as in English "giggle" <br>
            <strong>m</strong> - as in English "mom" <br>
            <strong>s</strong> - as in English "sassy" <br>
            <strong>ŵ</strong> - as in English "want" but with nasalization <br>
            <strong>hw</strong> - as in English "which" <br>
          </div>
        </div>
      </div>

      <div class="sense-section">
        <h2 class="sense-title">Double Consonants</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
          <div>
            <strong>ts</strong> - as in English "hats" <br>
            <strong>dz</strong> - as in English "cods" <br>
            <strong>j</strong> - as in English "job" <br>
            <strong>ng</strong> - as in English "singer" <br>
            <strong>gw</strong> - as in English "iguana" <br>
          </div>
          <div>
            <strong>ch</strong> - as in English "chores" <br>
            <strong>z</strong> - as in English "zebra" <br>
            <strong>zh</strong> - as in English "Persian" <br>
            <strong>nd</strong> - as in English "Monday" <br>
          </div>
        </div>
      </div>

      <div class="sense-section" style="border: none;">
        <h2 class="sense-title">Vowel Diphthongs</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
          <div>
            <strong>au</strong> - as in English "ouch" <br>
            <strong>ai</strong> - pronounced like English "I" <br>
            <strong>ia</strong> - as in 'ia' in "Santeria" <br>
            <strong>ei</strong> - as in 'ay' in "say" <br>
            <strong>oi</strong> - as in 'oy' in "boy" <br>
            <strong>üa</strong> - say 'u' in "put" with lips apart followed by 'a' as in "father" <br>
            <strong>aa</strong> - as in English "father" but longer <br>
          </div>
          <div>
            <strong>ae</strong> - as in 'a' in "bat" <br>
            <strong>io</strong> - as in 'eo' in the name "Leo" <br>
            <strong>oa</strong> - as in 'oa' in "boa constrictor" <br>
            <strong>ua</strong> - say 'oo' as in "root" followed by a 'a' sound <br>
            <strong>ui</strong> - say 'oo' as in "root" followed by an 'i' sound <br>
            <strong>üi</strong> - say 'u' in "put" with lips apart followed by an 'i' sound <br>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Pronunciation'
}
</script>
