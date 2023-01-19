'use strict'

require('array.prototype.flatmap').shim()
const { Client } = require('@elastic/elasticsearch')
const client = new Client({
  node: 'http://localhost:9200'
})

const corpus = require('../data/corpus.json')


async function run() {
  await client.indices.create({
    index: 'my_metaphor',
    body: {
      "settings": {
        "analysis": {
          "analyzer": {
            "plain" : {
            "filter" : [],
            "tokenizer" : "standard"
            },
            "inflections" : {
              "filter" : ["porter_stem"],
              "tokenizer" : "standard"
            },
            "case_insensitive" : {
            "filter" : ["lowercase"],
            "tokenizer" : "standard"
            },
            "case_insensitive_and_inflections" : {
              "filter" : ["lowercase", "porter_stem"],
              "tokenizer" : "standard"
            }"my_analyzer": {
              "type": "custom",
              "tokenizer": "icu_tokenizer",
              "filter": ["customNgramFilter", "customStopWordFilter"]
            },
          },
          "filter": {
            "customStopWordFilter": {
              "type": "stop",
              "ignore_case": true,
              "stopwords": ["ගත්කරු", "රචකයා", "වර්ගය", "වර්‍ගයේ", "වර්ගයේම", "වර්ගයේ", "ලියන්නා", "ලියන", "රචිත", "ලියපු", "ලියව්‌ව", "රචනා", "රචක", "ලියන්", "ලිවූ", "ගායකයා", "ගයනවා", "ගායනා", "ගායනා", "ගැයු", "ගයන", "කිව්", "කිවු", "සංගීත", "සංගීතවත්", "සංගීතය", "වැනි", "ඇතුලත්", "ඇතුලු", "විදියේ", "විදිහේ", "හොඳම", "ජනප්‍රිය", "ප්‍රචලිත", "ප්‍රසිද්ධම", "හොදම", "ජනප්‍රියම", "ලස්සනම", "ගීත", "සිංදු", "ගී", "සින්දු"]
            },
            "customNgramFilter": {
              "type": "edge_ngram",
              "min_gram": "4",
              "max_gram": "18",
              "side": "front"
            }
          }
        }
      },
      "mappings": {
        "properties": {
  
          "song_title_si": {
            "type": "text",
            "fields": {
              "raw": {
                "type": "keyword"
              }
            },
            "analyzer": "my_analyzer"
          },
          "artist_si": {
            "type": "text",
            "fields": {
              "raw": {
                "type": "keyword"
              }
            },
            "analyzer": "my_analyzer"
          },
          "writer_si": {
            "type": "text",
            "fields": {
              "raw": {
                "type": "keyword"
              }
            },
            "analyzer": "my_analyzer"
          },

  
          "song_title_en": {
            "type": "text",
            "analyzer": "plain",
            "fields": {
              "case_insensitive": {
                "type":  "text",
                "analyzer": "case_insensitive"
              },
              "inflections": {
                "type":  "text",
                "analyzer": "inflections"
              },
              "case_insensitive_and_inflections": {
                "type":  "text",
                "analyzer": "case_insensitive_and_inflections"
              }
            }
          },
          "artist_en": {
            "type": "text",
            "analyzer": "plain",
            "fields": {
              "case_insensitive": {
                "type":  "text",
                "analyzer": "case_insensitive"
              },
              "inflections": {
                "type":  "text",
                "analyzer": "inflections"
              },
              "case_insensitive_and_inflections": {
                "type":  "text",
                "analyzer": "case_insensitive_and_inflections"
              }
            }
          },
          "lyrics": { "type": "text" },
  
          "metaphors": {
            "type": "nested",
            "include_in_root": true,
            "properties": {
              "metaphor": {
                "type": "text",
                "analyzer": "my_analyzer"
              },
              "source": {
                "type": "text",
                "fields": {
                  "raw": {
                    "type": "keyword"
                  }
                },
                "analyzer": "my_analyzer"
              },
              "target": {
                "type": "text",
                "fields": {
                  "raw": {
                    "type": "keyword"
                  }
                },
                "analyzer": "my_analyzer"
              },
              "meaning": {
                "type": "text",
                "analyzer": "my_analyzer"
              }
            }
          },
          "year": {
            "type": "text",
            "fields": {
              "raw": {
                "type": "long"
              }
            }
          },

  
          "writer_en": {
            "type": "text",
            "analyzer": "plain",
            "fields": {
              "case_insensitive": {
                "type":  "text",
                "analyzer": "case_insensitive"
              },
              "inflections": {
                "type":  "text",
                "analyzer": "inflections"
              },
              "case_insensitive_and_inflections": {
                "type":  "text",
                "analyzer": "case_insensitive_and_inflections"
              }
            }
          },
  
          
  
        }
  
      }
    }
  }, { ignore: [400] })

  const dataset = corpus;

  const body = dataset.flatMap(doc => [{ index: { _index: 'my_metaphor' } }, doc])

  const { body: bulkResponse } = await client.bulk({ refresh: true, body })

  if (bulkResponse.errors) {
    const erroredDocuments = []
    bulkResponse.items.forEach((action, i) => {
      const operation = Object.keys(action)[0]
      if (action[operation].error) {
        erroredDocuments.push({
          status: action[operation].status,
          error: action[operation].error,
          operation: body[i * 2],
          document: body[i * 2 + 1]
        })
      }
    })
    console.log(erroredDocuments)
  }

  const { body: count } = await client.count({ index: 'my_metaphor' })
  console.log(count)
}

run().catch(console.log)