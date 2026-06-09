use scraper::{Html, Selector};
use url::Url;

pub fn extract_text(html: &str) -> String {
    let doc = Html::parse_document(html);
    let body_sel = Selector::parse("body, article, main").unwrap_or_else(|_| Selector::parse("body").unwrap());
    let text_sel = Selector::parse("p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, pre, code, a, span, div, section").unwrap();

    let mut text = String::new();

    // Try to get body content first
    if let Some(body) = doc.select(&body_sel).next() {
        for element in body.select(&text_sel) {
            let fragment = element.text().collect::<String>();
            let trimmed = fragment.trim();
            if !trimmed.is_empty() {
                text.push_str(trimmed);
                text.push(' ');
            }
        }
    }

    if text.trim().is_empty() {
        // Fallback: get all text
        for node in doc.root_element().text() {
            let trimmed = node.trim();
            if !trimmed.is_empty() {
                text.push_str(trimmed);
                text.push(' ');
            }
        }
    }

    // Normalize whitespace
    let mut result = String::with_capacity(text.len());
    let mut prev_space = false;
    for ch in text.chars() {
        if ch.is_whitespace() {
            if !prev_space {
                result.push(' ');
                prev_space = true;
            }
        } else {
            result.push(ch);
            prev_space = false;
        }
    }
    result.trim().to_string()
}

pub fn extract_title(html: &str) -> Option<String> {
    let doc = Html::parse_document(html);
    let sel = Selector::parse("title").ok()?;
    doc.select(&sel)
        .next()
        .map(|e| e.text().collect::<String>().trim().to_string())
}

pub fn extract_links(html: &str, base_url: &str) -> Vec<String> {
    let doc = Html::parse_document(html);
    let sel = Selector::parse("a[href]").ok();
    let base = Url::parse(base_url).ok();

    let mut links = Vec::new();
    if let Some(sel) = sel {
        for element in doc.select(&sel) {
            if let Some(href) = element.value().attr("href") {
                let href = href.trim();
                if href.is_empty() || href.starts_with('#') || href.starts_with("javascript:") || href.starts_with("mailto:") {
                    continue;
                }

                let absolute = if let Some(ref base) = base {
                    base.join(href).ok()
                } else {
                    Url::parse(href).ok()
                };

                if let Some(url) = absolute {
                    let mut url = url;
                    url.set_fragment(None);
                    let normalized = url.as_str().to_string();

                    // Filter out non-HTTP(S) and non-HTML resources
                    if url.scheme() == "http" || url.scheme() == "https" {
                        links.push(normalized);
                    }
                }
            }
        }
    }
    links
}
