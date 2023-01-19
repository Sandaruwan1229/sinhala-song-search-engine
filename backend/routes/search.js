"use strict";

const express = require("express");
const router = express.Router();

const { Client } = require("@elastic/elasticsearch");
const client = new Client({ node: "http://localhost:9200" });

var stopwords_lst = require("../../data/stopwords.json");
var stemwords_lst = require("../../data/stemwords.json");
var engine_keywords = require("../../data/keywords.json");

router.post("/", async function (req, res) {
  // test pre processing
  var user_query = req.body.query;
  //   trim the user query
  var user_query_trimmed = user_query.trim();
  //   split the trimed query
  var user_query_words = user_query_trimmed.split(" ");
  var removing_stopwords = [];
  var size = 100;

  var range = 0;
  var sort_method = [];
  // boosting method
  var field_type = "most_fields";
  // intial scores
  var en_writer = 1;
  var si_writer = 1;
  var en_artist = 1;
  var si_artist = 1;
  var en_song_title = 1;
  var si_song_title = 1;
  //   add more wegiht to year to filter as expected
  var en_year = 20;
  var si_year = 20;
  var metaphors = 1;
  var lyrics = 1;

  user_query_words.forEach((word) => {
    // langiage checking
    if (/^[A-Za-z0-9/\s/]*$/.test(user_query_trimmed)) {
      // English

      // Increase score based on stopwords and add those stops words into removing stopwords array.
      if (stopwords_lst.en_artist.includes(word)) {
        en_artist += 1;
        removing_stopwords.push(word);
      }

      if (stopwords_lst.en_writer.includes(word)) {
        en_writer += 1;
        removing_stopwords.push(word);
      }

      if (stopwords_lst.en_song_title.includes(word)) {
        en_song_title += 1;
        removing_stopwords.push(word);
      }

      if (stopwords_lst.en_year.includes(word)) {
        en_year += 1;
        removing_stopwords.push(word);
      }

      // Increase score based on stemwords and replace the stemword with space

      stemwords_lst.en_writer.forEach((stemword) => {
        if (word.includes(stemword)) {
          word.replace(stemword, "");
          en_writer += 1;
        }
      });

      stemwords_lst.en_artist.forEach((stemword) => {
        if (word.includes(stemword)) {
          word.replace(stemword, "");
          en_artist += 1;
        }
      });

      // Increase score based on engine_keywords.
      if (engine_keywords.writers_en.includes(word)) {
        en_writer += 1;
      }

      if (engine_keywords.artists_en.includes(word)) {
        en_artist += 1;
      }

      if (engine_keywords.years.includes(word)) {
        en_year += 1;
      }
    } else {
      // Sinhala

      // Increase score based on stopwords and add those stops words into removing stopwords array.

      if (stopwords_lst.si_artist.includes(word)) {
        si_artist += 1;
        removing_stopwords.push(word);
      }

      if (stopwords_lst.si_writer.includes(word)) {
        si_writer += 1;
        removing_stopwords.push(word);
      }

      if (stopwords_lst.si_song_title.includes(word)) {
        si_song_title += 1;
        removing_stopwords.push(word);
      }

      if (stopwords_lst.si_year.includes(word)) {
        si_year += 1;
        removing_stopwords.push(word);
      }

      if (stopwords_lst.metaphors.includes(word)) {
        metaphors += 1;
        removing_stopwords.push(word);
      }

      // Increase score based on stemwords and replace the stemword with space

      stemwords_lst.si_writer.forEach((stemword) => {
        if (word.includes(stemword)) {
          word.replace(stemword, "");
          si_writer += 1;
        }
      });

      stemwords_lst.si_artist.forEach((stemword) => {
        if (word.includes(stemword)) {
          word.replace(stemword, "");
          si_artist += 1;
        }
      });

      // Increase score based on engine_keywords.
      if (engine_keywords.writers_si.includes(word)) {
        si_writer += 1;
      }

      if (engine_keywords.artists_si.includes(word)) {
        si_artist += 1;
      }

      if (engine_keywords.years.includes(word)) {
        si_year += 1;
      }
    }

    if (stopwords_lst.sorting.includes(word)) {
      sorting += 1;
      removing_stopwords.push(word);
    }
  });

  stopwords_lst.common.forEach((word) => {
    user_query = user_query.replace(word, "");
  });

  // removing all stop words from query
  removing_stopwords.forEach((word) => {
    user_query = user_query.replace(word, "");
  });

  //   Query

  // query for english language

  if (/^[A-Za-z0-9]*$/.test(user_query_trimmed)) {
    var result = await client.search({
      index: "my_metaphor",
      body: {
        size: size,
        _source: {
          includes: [
            "si_song_title",
            "si_writer",
            "si_artist",
            "lyrics",
            "year",
            "metaphors.metaphor",
            "metaphors.source",
            "metaphors.target",
            "metaphors.meaning",
          ],
        },
        sort: sort_method,
        query: {
          multi_match: {
            query: user_query.trim(),
            fields: [
              `en_artist.case_insensitive_and_inflections^${en_artist}`, // field boosting
              `en_song_title.case_insensitive_and_inflections^${en_song_title}`,
              `en_writer.case_insensitive_and_inflections^${en_writer}`,
              `year^${en_year}`,
            ],
            operator: "or",
            type: field_type,
          },
        },
        // Aggregation used to grouped the result according followings
        aggs: {
          song_title_filter: {
            terms: {
              field: "en_song_title.raw",
              size: 10,
            },
          },
          artist_filter: {
            terms: {
              field: "en_artist.raw",
              size: 10,
            },
          },
          writer_filter: {
            terms: {
              field: "en_writer.raw",
              size: 10,
            },
          },
          year_filter: {
            terms: {
              field: "year.raw",
              size: 10,
            },
            metaphore_filter: {
              terms: {
                field: "metaphors.meaning.raw",
                size: 10,
              },
            },
          },
        },
      },
    });
  } else {
    // query for sinhala language

    var result = await client.search({
      index: "my_metaphor",
      body: {
        size: size,
        _source: {
          includes: [
            "si_song_title",
            "si_writer",
            "si_artist",
            "lyrics",
            "year",
            "metaphors.metaphor",
            "metaphors.source",
            "metaphors.target",
            "metaphors.meaning",
          ],
        },
        sort: sort_method,
        query: {
          multi_match: {
            query: user_query.trim(),
            fields: [
              `si_artist^${si_artist}`, // field boosting
              `si_writer^${si_writer}`,
              `si_song_title^${si_song_title}`,
              `year^${si_year}`,
              `lyrics^${lyrics}`,
              `metaphors.metaphor^${lyrics}`,
              `metaphors.source^${lyrics}`,
              `metaphors.target^${metaphors}`,
              `metaphors.meaning^${metaphors}`,
            ],
            operator: "or",
            type: field_type,
          },
        },
        // Aggregation used to grouped the result according followings
        aggs: {
          writer_filter: {
            terms: {
              field: "si_writer.raw",
              size: 10,
            },
          },
          song_title_filter: {
            terms: {
              field: "si_song_title.raw",
              size: 10,
            },
          },
          artist_filter: {
            terms: {
              field: "si_artist.raw",
              size: 10,
            },
          },
          year_filter: {
            terms: {
              field: "year.raw",
              size: 10,
            },
            metaphore_filter: {
              terms: {
                field: "metaphors.meaning.raw",
                size: 10,
              },
            },
          },
        },
      },
    });
  }

  res.send({
    aggs: result.body.aggregations,
    hits: result.body.hits.hits,
  });
});

module.exports = router;
