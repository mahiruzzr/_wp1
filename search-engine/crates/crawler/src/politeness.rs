use std::collections::HashMap;
use std::time::{Duration, Instant};

pub struct PolitenessPolicy {
    delays: HashMap<String, Duration>,
    last_fetch: HashMap<String, Instant>,
    default_delay: Duration,
}

impl PolitenessPolicy {
    pub fn new(default_delay_ms: u64) -> Self {
        Self {
            delays: HashMap::new(),
            last_fetch: HashMap::new(),
            default_delay: Duration::from_millis(default_delay_ms),
        }
    }

    pub fn set_delay(&mut self, domain: &str, delay_ms: u64) {
        self.delays.insert(domain.to_string(), Duration::from_millis(delay_ms));
    }

    pub fn delay(&self, url: &str) -> Duration {
        let domain = url.split('/').nth(2).unwrap_or("");
        self.delays.get(domain).copied().unwrap_or(self.default_delay)
    }

    pub fn wait_time(&self, url: &str) -> Duration {
        let domain = url.split('/').nth(2).unwrap_or("");
        let delay = self.delays.get(domain).copied().unwrap_or(self.default_delay);
        if let Some(last) = self.last_fetch.get(domain) {
            let elapsed = last.elapsed();
            if elapsed < delay {
                return delay - elapsed;
            }
        }
        Duration::ZERO
    }

    pub fn record_fetch(&mut self, url: &str) {
        let domain = url.split('/').nth(2).unwrap_or("").to_string();
        self.last_fetch.insert(domain, Instant::now());
    }
}
