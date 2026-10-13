use std::ffi::CString;
use std::ptr;

use super::gtk_future::GtkDialogFuture;
use super::utils::GtkGlobalThread;
use super::AsGtkDialog;

use crate::message_dialog::{MessageButtons, MessageDialog, MessageLevel};
use crate::MessageDialogResult;

pub struct GtkMessageDialog {
    buttons: MessageButtons,
    ptr: *mut gtk_sys::GtkDialog,
}

impl GtkMessageDialog {
    pub fn new(opt: MessageDialog) -> Self {
        let level = match opt.level {
            MessageLevel::Info => gtk_sys::GTK_MESSAGE_INFO,
            MessageLevel::Warning => gtk_sys::GTK_MESSAGE_WARNING,
            MessageLevel::Error => gtk_sys::GTK_MESSAGE_ERROR,
        };

        let buttons = match opt.buttons {
            MessageButtons::Ok => gtk_sys::GTK_BUTTONS_OK,
            MessageButtons::OkCancel => gtk_sys::GTK_BUTTONS_OK_CANCEL,
            MessageButtons::YesNo => gtk_sys::GTK_BUTTONS_YES_NO,
            MessageButtons::YesNoCancel => gtk_sys::GTK_BUTTONS_NONE,
            MessageButtons::OkCustom(_) => gtk_sys::GTK_BUTTONS_NONE,
            MessageButtons::OkCancelCustom(_, _) => gtk_sys::GTK_BUTTONS_NONE,
            MessageButtons::YesNoCancelCustom(_, _, _) => gtk_sys::GTK_BUTTONS_NONE,
        };

        let custom_buttons = match &opt.buttons {
            MessageButtons::YesNoCancel => vec![
                Some((CString::new("Yes").unwrap(), gtk_sys::GTK_RESPONSE_YES)),
                Some((CString::new("No").unwrap(), gtk_sys::GTK_RESPONSE_NO)),
                Some((
                    CString::new("Cancel").unwrap(),
                    gtk_sys::GTK_RESPONSE_CANCEL,
                )),
                None,
            ],
            MessageButtons::OkCustom(ok_text) => vec![
                Some((
                    CString::new(ok_text.as_bytes()).unwrap(),
                    gtk_sys::GTK_RESPONSE_OK,
                )),
                None,
            ],
            MessageButtons::OkCancelCustom(ok_text, cancel_text) => vec![
                Some((
                    CString::new(ok_text.as_bytes()).unwrap(),
                    gtk_sys::GTK_RESPONSE_OK,
                )),
                Some((
                    CString::new(cancel_text.as_bytes()).unwrap(),
                    gtk_sys::GTK_RESPONSE_CANCEL,
                )),
            ],
            MessageButtons::YesNoCancelCustom(yes_text, no_text, cancel_text) => vec![
                Some((
                    CString::new(yes_text.as_bytes()).unwrap(),
                    gtk_sys::GTK_RESPONSE_YES,
                )),
                Some((
                    CString::new(no_text.as_bytes()).unwrap(),
                    gtk_sys::GTK_RESPONSE_NO,
                )),
                Some((
                    CString::new(cancel_text.as_bytes()).unwrap(),
                    gtk_sys::GTK_RESPONSE_CANCEL,
                )),
                None,
            ],
            _ => vec![],
        };

        let s: &str = &opt.title;
        let title = CString::new(s).unwrap();
        let s: &str = &opt.description;
        let description = CString::new(s).unwrap();

        let ptr = unsafe {
            let dialog = gtk_sys::gtk_message_dialog_new(
                ptr::null_mut(),
                gtk_sys::GTK_DIALOG_MODAL,
                level,
                buttons,
                b"%s\0".as_ptr() as *mut _,
                title.as_ptr(),
            ) as *mut gtk_sys::GtkDialog;

            // Also set the window title, otherwise it would be empty
            gtk_sys::gtk_window_set_title(dialog as _, title.as_ptr());

            for custom_button in custom_buttons {
                if let Some((custom_button_cstr, response_id)) = custom_button {
                    gtk_sys::gtk_dialog_add_button(
                        dialog,
                        custom_button_cstr.as_ptr(),
                        response_id,
                    );
                }
            }

            dialog
        };

        unsafe {
            // GTK's second argument is printf syntax; description is untrusted literal data.
            gtk_sys::gtk_message_dialog_format_secondary_text(
                ptr as *mut _,
                b"%s\0".as_ptr() as *const _,
                description.as_ptr(),
            );
            configure_child_labels(ptr);
        }

        Self {
            ptr,
            buttons: opt.buttons,
        }
    }

    pub fn run(self) -> MessageDialogResult {
        let res = unsafe { gtk_sys::gtk_dialog_run(self.ptr) };

        use MessageButtons::*;
        match (&self.buttons, res) {
            (Ok | OkCancel, gtk_sys::GTK_RESPONSE_OK) => MessageDialogResult::Ok,
            (Ok | OkCancel | YesNoCancel, gtk_sys::GTK_RESPONSE_CANCEL) => {
                MessageDialogResult::Cancel
            }
            (YesNo | YesNoCancel, gtk_sys::GTK_RESPONSE_YES) => MessageDialogResult::Yes,
            (YesNo | YesNoCancel, gtk_sys::GTK_RESPONSE_NO) => MessageDialogResult::No,
            (OkCustom(custom), gtk_sys::GTK_RESPONSE_OK) => {
                MessageDialogResult::Custom(custom.to_owned())
            }
            (OkCancelCustom(custom, _), gtk_sys::GTK_RESPONSE_OK) => {
                MessageDialogResult::Custom(custom.to_owned())
            }
            (OkCancelCustom(_, custom), gtk_sys::GTK_RESPONSE_CANCEL) => {
                MessageDialogResult::Custom(custom.to_owned())
            }
            (YesNoCancelCustom(custom, _, _), gtk_sys::GTK_RESPONSE_YES) => {
                MessageDialogResult::Custom(custom.to_owned())
            }
            (YesNoCancelCustom(_, custom, _), gtk_sys::GTK_RESPONSE_NO) => {
                MessageDialogResult::Custom(custom.to_owned())
            }
            (YesNoCancelCustom(_, _, custom), gtk_sys::GTK_RESPONSE_CANCEL) => {
                MessageDialogResult::Custom(custom.to_owned())
            }
            _ => MessageDialogResult::Cancel,
        }
    }
}

unsafe fn is_label(type_instance: *const gobject_sys::GTypeInstance) -> bool {
    (*(*type_instance).g_class).g_type == gtk_sys::gtk_label_get_type()
}

/// Keep complete long messages selectable and scrollable without pushing actions off-screen.
unsafe fn configure_child_labels(dialog: *mut gtk_sys::GtkDialog) {
    const MAX_BODY_HEIGHT: i32 = 480;
    const BODY_WIDTH: i32 = 560;
    let area = gtk_sys::gtk_message_dialog_get_message_area(dialog as _);
    let children = gtk_sys::gtk_container_get_children(area as _);
    let mut current = children;
    while !current.is_null() {
        let child = (*current).data;
        if is_label(child as _) {
            gtk_sys::gtk_label_set_selectable(child as _, 1);
            let mut minimum = 0;
            let mut natural = 0;
            gtk_sys::gtk_widget_get_preferred_height_for_width(
                child as _, BODY_WIDTH, &mut minimum, &mut natural,
            );
            if natural > MAX_BODY_HEIGHT {
                let scroller = gtk_sys::gtk_scrolled_window_new(ptr::null_mut(), ptr::null_mut());
                gtk_sys::gtk_scrolled_window_set_policy(
                    scroller as _, gtk_sys::GTK_POLICY_AUTOMATIC, gtk_sys::GTK_POLICY_AUTOMATIC,
                );
                gtk_sys::gtk_scrolled_window_set_min_content_height(scroller as _, 240);
                gtk_sys::gtk_scrolled_window_set_max_content_height(scroller as _, MAX_BODY_HEIGHT);
                gtk_sys::gtk_scrolled_window_set_propagate_natural_height(scroller as _, 1);
                gtk_sys::gtk_widget_set_size_request(scroller, BODY_WIDTH, -1);
                // Removing a container's child releases its reference; retain it through reparenting.
                gobject_sys::g_object_ref(child as _);
                gtk_sys::gtk_container_remove(area as _, child as _);
                gtk_sys::gtk_container_add(scroller as _, child as _);
                gtk_sys::gtk_box_pack_start(area as _, scroller, 1, 1, 0);
                gobject_sys::g_object_unref(child as _);
            }
        }
        current = (*current).next;
    }
    glib_sys::g_list_free(children);
}

impl Drop for GtkMessageDialog {
    fn drop(&mut self) {
        unsafe {
            gtk_sys::gtk_widget_destroy(self.ptr as *mut _);
        }
    }
}

impl AsGtkDialog for GtkMessageDialog {
    fn gtk_dialog_ptr(&self) -> *mut gtk_sys::GtkDialog {
        self.ptr as *mut _
    }
    unsafe fn show(&self) {
        gtk_sys::gtk_widget_show_all(self.ptr as *mut _);
    }
}

use crate::backend::MessageDialogImpl;

impl MessageDialogImpl for MessageDialog {
    fn show(self) -> MessageDialogResult {
        GtkGlobalThread::instance().run_blocking(move || {
            let dialog = GtkMessageDialog::new(self);
            dialog.run()
        })
    }
}

use crate::backend::AsyncMessageDialogImpl;
use crate::backend::DialogFutureType;

impl AsyncMessageDialogImpl for MessageDialog {
    fn show_async(self) -> DialogFutureType<MessageDialogResult> {
        let builder = move || GtkMessageDialog::new(self);

        let future = GtkDialogFuture::new(builder, |_, res| match res {
            gtk_sys::GTK_RESPONSE_OK => MessageDialogResult::Ok,
            gtk_sys::GTK_RESPONSE_CANCEL => MessageDialogResult::Cancel,
            gtk_sys::GTK_RESPONSE_YES => MessageDialogResult::Yes,
            gtk_sys::GTK_RESPONSE_NO => MessageDialogResult::No,
            gtk_sys::GTK_RESPONSE_DELETE_EVENT => MessageDialogResult::Cancel,
            _ => unreachable!(),
        });
        Box::pin(future)
    }
}

#[cfg(test)]
mod literal_tests {
    use super::*;
    use std::ffi::CStr;

    #[test]
    #[ignore = "Requires a GTK display; run explicitly for native dialog regression"]
    fn secondary_text_preserves_literal_printf_sequences() {
        const EXPECTED: &str = "Literal %s %n %02d %% 中文 😀";
        let found = GtkGlobalThread::instance().run_blocking(|| {
            let dialog = GtkMessageDialog::new(
                MessageDialog::new()
                    .set_title("Literal title %s")
                    .set_description(EXPECTED),
            );
            unsafe {
                let area = gtk_sys::gtk_message_dialog_get_message_area(dialog.ptr as _);
                let children = gtk_sys::gtk_container_get_children(area as _);
                let mut current = children;
                let mut found = false;
                while !current.is_null() {
                    let child = (*current).data;
                    if is_label(child as _) {
                        let text = gtk_sys::gtk_label_get_text(child as _);
                        found |= CStr::from_ptr(text).to_bytes() == EXPECTED.as_bytes();
                    }
                    current = (*current).next;
                }
                glib_sys::g_list_free(children);
                found
            }
        });
        assert!(found, "GTK must display the complete literal secondary text");
    }

    #[test]
    #[ignore = "Requires a GTK display; run explicitly for native dialog regression"]
    fn complete_long_disclosure_keeps_actions_on_screen() {
        let description = "Exact literal %s %n %% 中文 😀\n".repeat(400);
        let (complete, height) = GtkGlobalThread::instance().run_blocking(move || {
            let dialog = GtkMessageDialog::new(
                MessageDialog::new()
                    .set_title("Complete external execution disclosure")
                    .set_description(&description),
            );
            unsafe {
                let area = gtk_sys::gtk_message_dialog_get_message_area(dialog.ptr as _);
                let children = gtk_sys::gtk_container_get_children(area as _);
                let mut current = children;
                let mut complete = false;
                while !current.is_null() {
                    let child = (*current).data;
                    if (*(*(child as *mut gobject_sys::GTypeInstance)).g_class).g_type
                        == gtk_sys::gtk_scrolled_window_get_type()
                    {
                        let viewport = gtk_sys::gtk_bin_get_child(child as _);
                        let label = gtk_sys::gtk_bin_get_child(viewport as _);
                        if !label.is_null() && is_label(label as _) {
                            complete |= CStr::from_ptr(gtk_sys::gtk_label_get_text(label as _))
                                .to_bytes() == description.as_bytes();
                        }
                    }
                    current = (*current).next;
                }
                glib_sys::g_list_free(children);
                gtk_sys::gtk_widget_show_all(dialog.ptr as _);
                while gtk_sys::gtk_events_pending() != 0 {
                    gtk_sys::gtk_main_iteration_do(0);
                }
                let mut width = 0;
                let mut height = 0;
                gtk_sys::gtk_window_get_size(dialog.ptr as _, &mut width, &mut height);
                (complete, height)
            }
        });
        assert!(complete, "The entire disclosed UTF-8 data must remain readable and selectable");
        assert!(height > 0 && height <= 900, "Native actions must fit a desktop viewport: {height}");
    }
}
