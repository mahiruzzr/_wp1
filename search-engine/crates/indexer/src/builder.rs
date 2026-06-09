use anyhow::Result;
use common::types::Page;
use tantivy::{Index, IndexWriter, ReloadPolicy, TantivyDocument};
use tantivy::schema::OwnedValue;
use tantivy::collector::TopDocs;
use tantivy::query::{QueryParser, AllQuery};
use tantivy::directory::MmapDirectory;
use std::path::Path;
use std::sync::Arc;
use tracing::info;

use crate::schema::SearchSchema;

pub struct IndexBuilder {
    schema: Arc<SearchSchema>,
    index: Index,
}

impl IndexBuilder {
    pub fn open(index_path: &str) -> Result<Self> {
        let ss = Arc::new(SearchSchema::new());
        let path = Path::new(index_path);
        std::fs::create_dir_all(path)?;
        let dir = MmapDirectory::open(path)?;
        let index = Index::open_or_create(dir, ss.schema.clone())?;
        Ok(Self { schema: ss, index })
    }

    pub fn writer(&self) -> Result<IndexWriter> {
        Ok(self.index.writer(50_000_000)?)
    }

    pub fn index_page(&self, writer: &mut IndexWriter, page: &Page) -> Result<()> {
        let title = page.title.as_deref().unwrap_or("");
        let body = page.body.as_deref().unwrap_or("");
        let url = &page.url;
        let domain = page.url.split('/').nth(2).unwrap_or("");

        let mut doc = TantivyDocument::new();
        doc.add_text(self.schema.title, title);
        doc.add_text(self.schema.body, body);
        doc.add_text(self.schema.url, url);
        doc.add_text(self.schema.domain, domain);
        doc.add_f64(self.schema.score_weight, 1.0);
        writer.add_document(doc)?;
        Ok(())
    }

    pub fn build_index(&self, pages: &[Page]) -> Result<()> {
        let mut writer = self.writer()?;
        let total = pages.len();
        for (i, page) in pages.iter().enumerate() {
            self.index_page(&mut writer, page)?;
            if i % 1000 == 0 && i > 0 {
                info!("Indexed {}/{} pages", i, total);
                writer.commit()?;
            }
        }
        writer.commit()?;
        info!("Index build complete: {} documents indexed", total);
        Ok(())
    }

    pub fn reader(&self) -> Result<tantivy::IndexReader> {
        Ok(self.index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?)
    }

    pub fn search_documents(
        &self,
        query_str: &str,
        page: usize,
        size: usize,
    ) -> Result<(Vec<(f32, String, String, String, String)>, u64)> {
        let reader = self.reader()?;
        let searcher = reader.searcher();
        let query_parser = QueryParser::for_index(&self.index, vec![
            self.schema.title,
            self.schema.body,
        ]);

        let query: Box<dyn tantivy::query::Query> = if query_str.is_empty() {
            Box::new(AllQuery)
        } else {
            query_parser.parse_query(query_str)?
        };

        let top_docs = searcher.search(&query, &TopDocs::with_limit(size).and_offset(page * size))?;

        let exact_total = top_docs.len() as u64;

        let results: Vec<(f32, String, String, String, String)> = top_docs
            .into_iter()
            .filter_map(|(score, doc_addr)| {
                let doc: TantivyDocument = searcher.doc::<TantivyDocument>(doc_addr).ok()?;

                let title_val = doc.get_first(self.schema.title)?;
                let title = tantivy_value_to_string(&title_val);

                let url_val = doc.get_first(self.schema.url)?;
                let url = tantivy_value_to_string(&url_val);

                let body_val = doc.get_first(self.schema.body)?;
                let body = tantivy_value_to_string(&body_val);

                let domain_val = doc.get_first(self.schema.domain)?;
                let domain = tantivy_value_to_string(&domain_val);

                let snippet = generate_snippet(&body, query_str, 60);
                Some((score, title, url, snippet, domain))
            })
            .collect();

        Ok((results, exact_total))
    }
}

fn tantivy_value_to_string(val: &OwnedValue) -> String {
    match val {
        OwnedValue::Str(s) => s.clone(),
        _ => format!("{:?}", val),
    }
}

pub fn generate_snippet(body: &str, query: &str, window: usize) -> String {
    let query_terms: Vec<&str> = query
        .split_whitespace()
        .filter(|t| !t.starts_with(['+', '-']))
        .collect();
    if query_terms.is_empty() {
        let words: Vec<&str> = body.split_whitespace().take(window).collect();
        return words.join(" ");
    }

    let words: Vec<&str> = body.split_whitespace().collect();
    if words.is_empty() {
        return String::new();
    }

    let mut best_pos = 0;
    let mut best_count = 0;

    for start in 0..words.len().saturating_sub(window) {
        let end = (start + window).min(words.len());
        let count = query_terms
            .iter()
            .filter(|t| words[start..end].iter().any(|w| w.eq_ignore_ascii_case(t)))
            .count();
        if count > best_count {
            best_count = count;
            best_pos = start;
        }
    }

    let snippet_words = &words[best_pos..(best_pos + window).min(words.len())];
    let mut result = String::new();
    for w in snippet_words {
        if query_terms.iter().any(|t| w.eq_ignore_ascii_case(t)) {
            result.push_str(&format!("<b>{}</b> ", w));
        } else {
            result.push_str(&format!("{} ", w));
        }
    }
    result.trim().to_string()
}

pub fn count_documents(index: &Index) -> Result<u64> {
    let reader = index.reader()?;
    let searcher = reader.searcher();
    Ok(searcher.num_docs() as u64)
}

pub fn estimate_index_size(index_path: &str) -> Result<f64> {
    let path = Path::new(index_path);
    let size = dir_size(path);
    Ok(size as f64 / 1024.0 / 1024.0)
}

fn dir_size(path: &std::path::Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let meta = entry.metadata().ok();
            if let Some(m) = meta {
                if m.is_dir() {
                    total += dir_size(&entry.path());
                } else {
                    total += m.len();
                }
            }
        }
    }
    total
}
