//! Admin API handlers

mod import;
mod keys;
mod logs;
mod pages;
mod stats;
mod sync;

pub use import::{export_handler, import_handler};
pub use keys::{
    batch_delete_keys_handler, delete_key_handler, list_keys_handler, merge_key_handler,
    rename_key_handler, update_key_handler,
};
pub use logs::logs_handler;
pub use pages::{batch_delete_pages_handler, list_pages_handler, update_page_handler};
pub use stats::stats_handler;
pub use sync::{sync_handler, sync_upload_handler};
