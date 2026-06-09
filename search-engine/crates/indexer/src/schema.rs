use tantivy::schema::*;

pub struct SearchSchema {
    pub schema: Schema,
    pub title: Field,
    pub body: Field,
    pub url: Field,
    pub domain: Field,
    pub score_weight: Field,
}

impl SearchSchema {
    pub fn new() -> Self {
        let mut sb = Schema::builder();
        let title = sb.add_text_field("title", TEXT | STORED);
        let body = sb.add_text_field("body", TEXT | STORED);
        let url = sb.add_text_field("url", STRING | STORED);
        let domain = sb.add_text_field("domain", STRING | STORED);
        let score_weight = sb.add_f64_field("score_weight", STORED);
        let schema = sb.build();
        Self { schema, title, body, url, domain, score_weight }
    }
}

