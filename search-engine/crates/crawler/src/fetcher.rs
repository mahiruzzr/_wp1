use anyhow::{Context, Result};

pub async fn fetch_page(url: &str, user_agent: &str) -> Result<(String, u16, String)> {
    let client = reqwest::Client::builder()
        .user_agent(user_agent)
        .timeout(std::time::Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()?;

    let resp = client.get(url).send().await?;
    let status = resp.status().as_u16();
    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    // Skip non-HTML
    if !content_type.contains("text/html") && !content_type.contains("text/plain") {
        anyhow::bail!("Not an HTML page: {}", content_type);
    }

    let html = resp.text().await.context("Failed to read response body")?;
    Ok((html, status, content_type))
}
