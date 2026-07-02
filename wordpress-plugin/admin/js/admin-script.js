/**
 * ParsTech Media Center Sync - Admin JavaScript helper
 * Uses WordPress Media Library APIs to offer custom zip selection
 */
jQuery(document).ready(function($) {
    'use strict';

    // Click trigger for zip upload
    $('#btn_upload_mediacenter_zip').on('click', function(e) {
        e.preventDefault();

        // If the media frame already exists, reopen it.
        var file_frame;
        if (file_frame) {
            file_frame.open();
            return;
        }

        // Create the media frame.
        file_frame = wp.media({
            title: 'انتخاب یا بارگذاری فایل بروزرسانی دسکتاپ (.zip)',
            button: {
                text: 'استفاده از این پکیج بروزرسانی'
            },
            multiple: false  // Direct single file targeting
        });

        // When a file is selected, run a callback.
        file_frame.on('select', function() {
            // Get the details of the selected item
            var attachment = file_frame.state().get('selection').first().toJSON();

            // Store the attachment URL in target textbox
            $('#mediacenter_download_url_input').val(attachment.url);

            // Give user visual notification feedback
            var successMessage = $('<span class="zip-upload-success" style="color:#059669; font-size:11px; font-weight:bold; display:block; margin-top:5px;">✓ فایل فشرده جدید با موفقیت تنظیم شد. حتما دکمه ذخیره زیر را فشار دهید.</span>');
            $('.zip-upload-success').remove();
            $('#mediacenter_download_url_input').parent().after(successMessage);
        });

        // Finally, open the modal.
        file_frame.open();
    });

    // Animate sync logs
    $('.parstech-table tbody tr').hover(
        function() {
            $(this).css('background-color', 'rgba(79, 70, 229, 0.02)');
        },
        function() {
            $(this).css('background-color', '');
        }
    );
});
