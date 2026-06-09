use std::collections::VecDeque;
use std::collections::HashSet;

pub struct UrlFrontier {
    queue: VecDeque<(String, usize)>,
    visited: HashSet<String>,
}

impl UrlFrontier {
    pub fn new() -> Self {
        Self {
            queue: VecDeque::new(),
            visited: HashSet::new(),
        }
    }

    pub fn enqueue(&mut self, url: String, depth: usize) {
        if !self.visited.contains(&url) {
            self.queue.push_back((url.clone(), depth));
        }
    }

    pub fn dequeue(&mut self) -> Option<(String, usize)> {
        while let Some((url, depth)) = self.queue.pop_front() {
            if !self.visited.contains(&url) {
                self.visited.insert(url.clone());
                return Some((url, depth));
            }
        }
        None
    }

    pub fn mark_visited(&mut self, url: &str) {
        self.visited.insert(url.to_string());
    }

    pub fn is_visited(&self, url: &str) -> bool {
        self.visited.contains(url)
    }

    pub fn len(&self) -> usize {
        self.queue.len()
    }

    pub fn is_empty(&self) -> bool {
        self.queue.is_empty()
    }
}
