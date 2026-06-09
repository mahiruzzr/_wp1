use std::collections::HashMap;
use std::time::Duration;

pub struct RobotsCache {
    cache: HashMap<String, RobotsTxt>,
}

struct RobotsTxt {
    disallowed: Vec<String>,
    crawl_delay: Option<u64>,
}

impl RobotsCache {
    pub fn new() -> Self {
        Self { cache: HashMap::new() }
    }

    pub async fn allowed(&mut self, url: &str, user_agent: &str) -> bool {
        let parsed = url::Url::parse(url);
        if parsed.is_err() {
            return false;
        }
        let parsed = parsed.unwrap();
        let domain = parsed.host_str().unwrap_or("").to_string();

        if !self.cache.contains_key(&domain) {
            let robots_url = format!("{}://{}/robots.txt", parsed.scheme(), domain);
            let robots = self.fetch_robots(&robots_url, user_agent).await;
            self.cache.insert(domain.clone(), robots);
        }

        let robots = self.cache.get(&domain).unwrap();
        let path = parsed.path();
        for disallowed in &robots.disallowed {
            if path.starts_with(disallowed) {
                return false;
            }
        }
        true
    }

    async fn fetch_robots(&self, url: &str, user_agent: &str) -> RobotsTxt {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .ok();

        let body = match client {
            Some(c) => c.get(url).header("User-Agent", user_agent).send().await,
            None => return RobotsTxt { disallowed: vec![], crawl_delay: None },
        };

        let body = match body {
            Ok(r) if r.status().is_success() => r.text().await.unwrap_or_default(),
            _ => return RobotsTxt { disallowed: vec![], crawl_delay: None },
        };

        let mut disallowed = Vec::new();
        let mut crawl_delay = None;
        let mut in_correct_agent = false;

        for line in body.lines() {
            let line = line.trim();
            if line.starts_with("User-agent:") {
                let agent = line.trim_start_matches("User-agent:").trim();
                in_correct_agent = agent == "*" || agent == user_agent;
            } else if in_correct_agent {
                if line.starts_with("Disallow:") {
                    let path = line.trim_start_matches("Disallow:").trim();
                    if !path.is_empty() {
                        disallowed.push(path.to_string());
                    }
                } else if line.starts_with("Crawl-delay:") {
                    if let Ok(delay) = line.trim_start_matches("Crawl-delay:").trim().parse::<u64>() {
                        crawl_delay = Some(delay);
                    }
                }
            }
        }

        RobotsTxt { disallowed, crawl_delay }
    }
}
