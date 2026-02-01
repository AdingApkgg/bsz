//! Admin API handlers

mod import;
mod keys;
mod pages;
mod stats;
mod sync;

pub use import::{export_handler, import_handler};
pub use keys::{delete_key_handler, list_keys_handler, update_key_handler};
pub use pages::{list_pages_handler, update_page_handler};
pub use stats::stats_handler;
pub use sync::{sync_handler, sync_upload_handler};
