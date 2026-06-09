use tantivy::tokenizer::{TextAnalyzer, TokenizerManager, LowerCaser, StopWordFilter, NgramTokenizer};
use tantivy::tokenizer::SimpleTokenizer;

pub fn default_analyzer() -> TextAnalyzer {
    TextAnalyzer::builder(SimpleTokenizer::default())
        .filter(LowerCaser)
        .build()
}

pub fn register_analyzers(tokenizer_manager: &TokenizerManager) {
    tokenizer_manager.register("default", default_analyzer());
}
