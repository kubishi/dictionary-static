import { XMLParser } from 'fast-xml-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Configure XML parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  arrayMode: false
});

async function parseLiftFile() {
  console.log('📖 Parsing .lift dictionary file...');

  // Read the .lift file
  const liftPath = path.join(ROOT_DIR, 'dictionary.lift');
  let xmlContent;
  
  try {
    xmlContent = await fs.readFile(liftPath, 'utf-8');
  } catch (error) {
    console.error('❌ Error: dictionary.lift file not found!');
    console.log('Please place your .lift file in the project root as "dictionary.lift"');
    process.exit(1);
  }

  // Parse XML
  const parsed = parser.parse(xmlContent);
  const lift = parsed.lift;

  if (!lift || !lift.entry) {
    console.error('❌ Error: Invalid .lift file format');
    process.exit(1);
  }

  // Ensure entries is an array
  const entries = Array.isArray(lift.entry) ? lift.entry : [lift.entry];

  console.log(`Found ${entries.length} entries`);

  // Process entries
  const words = [];
  const sentences = [];
  let wordId = 1;
  let sentenceId = 1;

  for (const entry of entries) {
    const word = processEntry(entry, wordId);
    if (word) {
      words.push(word);
      wordId++;

      // Extract sentences from examples
      if (word.sentences) {
        for (const sent of word.sentences) {
          sentences.push({
            id: sentenceId++,
            wordId: word.id,
            ...sent
          });
        }
      }
    }
  }

  // Create data directory
  await fs.mkdir(DATA_DIR, { recursive: true });

  // Write processed data
  await fs.writeFile(
    path.join(DATA_DIR, 'words.json'),
    JSON.stringify(words, null, 2)
  );

  await fs.writeFile(
    path.join(DATA_DIR, 'sentences.json'),
    JSON.stringify(sentences, null, 2)
  );

  // Create index for fast lookup
  const index = {
    totalWords: words.length,
    totalSentences: sentences.length,
    writingSystems: getWritingSystems(words),
    lastBuild: new Date().toISOString()
  };

  await fs.writeFile(
    path.join(DATA_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  );

  console.log(`✅ Processed ${words.length} words and ${sentences.length} sentences`);
  console.log('📊 Generating embeddings for semantic search...');

  // Generate embeddings
  await generateEmbeddings(words, sentences);

  console.log('✅ Build complete!');
}

function processEntry(entry, id) {
  const word = { id };

  // Extract GUID from entry attributes
  if (entry['@_guid']) {
    word.guid = entry['@_guid'];
  }

  // Extract entry ID
  if (entry['@_id']) {
    word.entryId = entry['@_id'];
  }

  // Extract date created/modified if available
  if (entry['@_dateCreated']) {
    word.dateCreated = entry['@_dateCreated'];
  }
  if (entry['@_dateModified']) {
    word.dateModified = entry['@_dateModified'];
  }

  // Extract lexical form (headword)
  if (entry['lexical-unit'] && entry['lexical-unit'].form) {
    const forms = Array.isArray(entry['lexical-unit'].form) 
      ? entry['lexical-unit'].form 
      : [entry['lexical-unit'].form];
    
    word.forms = {};
    for (const form of forms) {
      const lang = form['@_lang'];
      const text = form.text;
      if (lang && text) {
        word.forms[lang] = typeof text === 'object' ? text['#text'] : text;
      }
    }
  }

  // Get primary form (first available)
  word.word = Object.values(word.forms || {})[0] || '';

  // Create URL slug from primary form
  if (word.word) {
    word.slug = createSlug(word.word);
  }

  // Extract senses (definitions)
  word.senses = [];
  if (entry.sense) {
    const senses = Array.isArray(entry.sense) ? entry.sense : [entry.sense];
    
    for (const sense of senses) {
      const senseData = {
        definitions: {},
        glosses: {},
        examples: []
      };

      // Definition
      if (sense.definition && sense.definition.form) {
        const defForms = Array.isArray(sense.definition.form) 
          ? sense.definition.form 
          : [sense.definition.form];
        
        for (const form of defForms) {
          const lang = form['@_lang'];
          const text = form.text;
          if (lang && text) {
            senseData.definitions[lang] = typeof text === 'object' ? text['#text'] : text;
          }
        }
      }

      // Gloss
      if (sense.gloss) {
        const glosses = Array.isArray(sense.gloss) ? sense.gloss : [sense.gloss];
        for (const gloss of glosses) {
          const lang = gloss['@_lang'];
          const text = gloss.text || gloss['#text'];
          if (lang && text) {
            senseData.glosses[lang] = typeof text === 'object' ? text['#text'] : text;
          }
        }
      }

      // Grammatical info
      if (sense['grammatical-info']) {
        senseData.partOfSpeech = sense['grammatical-info']['@_value'];
      }

      // Examples
      if (sense.example) {
        const examples = Array.isArray(sense.example) ? sense.example : [sense.example];
        
        for (const example of examples) {
          const exampleData = {
            forms: {},
            translations: {}
          };
          
          // Extract forms (the example sentences in various languages)
          if (example.form) {
            const exForms = Array.isArray(example.form) ? example.form : [example.form];
            for (const form of exForms) {
              const lang = form['@_lang'];
              const text = form.text;
              if (lang && text) {
                exampleData.forms[lang] = typeof text === 'object' ? text['#text'] : text;
              }
            }
          }

          // Extract translations
          if (example.translation) {
            const translations = Array.isArray(example.translation) 
              ? example.translation 
              : [example.translation];
            
            for (const trans of translations) {
              if (trans.form) {
                const transForms = Array.isArray(trans.form) ? trans.form : [trans.form];
                for (const form of transForms) {
                  const lang = form['@_lang'];
                  const text = form.text;
                  if (lang && text) {
                    exampleData.translations[lang] = typeof text === 'object' ? text['#text'] : text;
                  }
                }
              }
            }
          }

          // Extract source/citation
          if (example.source) {
            if (typeof example.source === 'string') {
              exampleData.source = example.source;
            } else if (example.source['#text']) {
              exampleData.source = example.source['#text'];
            }
          }

          // Extract note if present
          if (example.note) {
            const notes = Array.isArray(example.note) ? example.note : [example.note];
            exampleData.notes = notes.map(note => {
              if (typeof note === 'string') return note;
              if (note.form) {
                const form = Array.isArray(note.form) ? note.form[0] : note.form;
                return form.text || form['#text'];
              }
              return note['#text'] || note;
            }).filter(Boolean);
          }

          if (Object.keys(exampleData.forms).length > 0) {
            senseData.examples.push(exampleData);
          }
        }
      }

      word.senses.push(senseData);
    }
  }

  // Extract sentences for separate index
  word.sentences = [];
  for (const sense of word.senses) {
    if (sense.examples && sense.examples.length > 0) {
      word.sentences.push(...sense.examples);
    }
  }

  // Extract notes
  if (entry.note) {
    const notes = Array.isArray(entry.note) ? entry.note : [entry.note];
    word.notes = notes.map(note => {
      if (typeof note === 'object' && note.form) {
        const form = Array.isArray(note.form) ? note.form[0] : note.form;
        return form.text || form['#text'];
      }
      return note;
    }).filter(Boolean);
  }

  return word;
}

function getWritingSystems(words) {
  const systems = new Set();
  
  for (const word of words) {
    if (word.forms) {
      Object.keys(word.forms).forEach(lang => systems.add(lang));
    }
  }

  return Array.from(systems);
}

// Create URL-safe slug from word text
function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateEmbeddings(words, sentences) {
  // For now, create a simple text representation for each entry
  // In production, you would generate actual embeddings here
  // but that's expensive at build time, so we'll do it on-demand in the browser
  
  const searchableWords = words.map(word => {
    const searchText = [
      word.word,
      ...Object.values(word.forms || {}),
      ...word.senses.flatMap(s => [
        ...Object.values(s.definitions || {}),
        ...Object.values(s.glosses || {})
      ])
    ].filter(Boolean).join(' ');

    return {
      id: word.id,
      text: searchText,
      type: 'word'
    };
  });

  const searchableSentences = sentences.map(sent => {
    const searchText = Object.values(sent)
      .filter(v => typeof v === 'string')
      .join(' ');

    return {
      id: sent.id,
      wordId: sent.wordId,
      text: searchText,
      type: 'sentence'
    };
  });

  await fs.writeFile(
    path.join(DATA_DIR, 'searchable.json'),
    JSON.stringify({
      words: searchableWords,
      sentences: searchableSentences
    }, null, 2)
  );
}

// Run the parser
parseLiftFile().catch(error => {
  console.error('❌ Error during parsing:', error);
  process.exit(1);
});
