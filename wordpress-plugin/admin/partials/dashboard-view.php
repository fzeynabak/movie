<?php
/**
 * Admin view page layout markup
 * @package ParsTechMediaCenterSync
 */

defined('ABSPATH') || exit;

// Retrieve DB instances and clients list
$db = ParsTechMediaCenter_DB::get_instance();
$clients = $db->get_all_clients();
$total_clients = count($clients);

// Process Support Ticket Reply submits
if (isset($_POST['mediacenter_reply_submit']) && check_admin_referer('reply_ticket_configs', 'mediacenter_ticket_nonce')) {
    $ticket_id = intval($_POST['ticket_id']);
    $reply_text = sanitize_textarea_field($_POST['reply_text']);
    $db->reply_to_ticket($ticket_id, $reply_text);
    echo '<div class="notice notice-success is-dismissible" style="margin-right:0px; margin-top:20px;">
            <p><strong>✓ پاسخ تیکت پشتیبانی با موفقیت ثبت شد و فوراً در برنامه کلاینت قابل رویت خواهد بود.</strong></p>
          </div>';
}

// Fetch all support tickets
$tickets = $db->get_all_tickets();
$total_tickets = count($tickets);
$pending_tickets = 0;
foreach($tickets as $t) {
    if ($t->status === 'pending') $pending_tickets++;
}

// Sum statistics
$total_movies = 0;
$total_series = 0;
$total_sales_records = 0;
foreach($clients as $c) {
    if (isset($c->total_movies)) $total_movies += intval($c->total_movies);
    if (isset($c->total_series)) $total_series += intval($c->total_series);
    if (isset($c->total_sales)) $total_sales_records += intval($c->total_sales);
}

// Check for updates
$latest_version = get_option('mediacenter_latest_version', '1.1.0');
$download_url = get_option('mediacenter_download_url', 'https://cofeclick.ir/downloads/mediacenter-latest.zip');
$update_changelog = get_option('mediacenter_update_changelog', 'حل کامل مشکلات بارگذاری پوسترها و ارتقای ساختار دیتابیس.');
?>

<div class="wrap parstech-wp-container">
    
    <!-- Custom Branding Header -->
    <div class="parstech-header">
        <div>
            <h1>مدیریت و مانیتورینگ جامع مدیا سنتر پارس تک</h1>
            <p>مشاهده نصب‌های زنده برنامه، مدیریت لایسنس خریداران و آپلود مستقیم بسته‌های بروزرسانی فشرده دسکتاپ</p>
        </div>
        <div>
            <span style="font-size:11px; font-weight:bold; background:#e0e7ff; color:#4f46e5; padding:6px 12px; border-radius:8px;">
                وب‌سایت مرجع: cofeclick.ir
            </span>
        </div>
    </div>

    <!-- Quick Statistics Widgets Grid -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:20px; margin-bottom: 24px;">
        
        <div class="parstech-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
            <div>
                <p class="parstech-stat-title">تعداد کل کاربران ثبت‌شده</p>
                <p class="parstech-stat-number"><?php echo esc_html($total_clients); ?></p>
            </div>
            <div class="parstech-stat-icon" style="background:#e0e7ff; color:#4f46e5;">👤</div>
        </div>

        <div class="parstech-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
            <div>
                <p class="parstech-stat-title">کل فیلم‌های آرشیوی کاربران</p>
                <p class="parstech-stat-number"><?php echo esc_html($total_movies); ?></p>
            </div>
            <div class="parstech-stat-icon" style="background:#fef3c7; color:#d97706;">🎬</div>
        </div>

        <div class="parstech-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
            <div>
                <p class="parstech-stat-title">کل فاکتورهای فیزیکی ثبت‌شده</p>
                <p class="parstech-stat-number"><?php echo esc_html($total_sales_records); ?></p>
            </div>
            <div class="parstech-stat-icon" style="background:#d1fae5; color:#059669;">💰</div>
        </div>

    </div>

    <div class="wp-layout-grid">
        
        <!-- Right Section: Table of active client installations and profiles -->
        <div class="parstech-card">
            <h3 style="font-weight:800; font-size:15px; margin-top:0; margin-bottom:16px; color:#1e293b; display:flex; align-items:center; gap:8px;">
                <span>📋</span> کلاینت‌های همگام‌سازی‌شده فعال و پایش زمان واقعی
            </h3>

            <?php if (empty($clients)) : ?>
                <div style="padding:48px; text-align:center; color:#64748b; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">
                    <p style="font-size:14px; font-weight:bold; margin-bottom:8px;">هیچ سناریوی تلمتری فعالی یافت نشد!</p>
                    <p style="font-size:11.5px; margin-top:0;">به محض ورود کاربران به اپلیکیشن دسکتاپ و اتصال به شبکه، آمار دقیق فروشگاه‌ها و فاکتورها به صورت کاملاً خودکار در این جدول فهرست خواهد شد.</p>
                </div>
            <?php else : ?>
                <div class="parstech-table-wrapper">
                    <table class="parstech-table">
                        <thead>
                            <tr>
                                <th>مشخصات سیستم و خریدار</th>
                                <th>نام فروشگاه</th>
                                <th>تلفن و اطلاعات تماس</th>
                                <th>رسانه و آرشیو</th>
                                <th>نگارش برنامه</th>
                                <th>آخرین پینگ</th>
                                <th>وضعیت</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach($clients as $c) : 
                                $last_seen = strtotime($c->last_heartbeat);
                                $is_active = (time() - $last_seen) < 180; // active within last 3 minutes
                            ?>
                                <tr>
                                    <td>
                                        <strong style="color:#0f172a; font-size:13px;"><?php echo esc_html($c->full_name); ?></strong>
                                        <div style="font-family:monospace; font-size:9.5px; color:#94a3b8; margin-top:3px;" dir="ltr"><?php echo esc_html($c->client_id); ?></div>
                                    </td>
                                    <td>
                                        <span style="font-weight:600; color:#475569;"><?php echo esc_html($c->shop_name ? $c->shop_name : 'فروشگاه تستی'); ?></span>
                                    </td>
                                    <td>
                                        <div style="font-weight:bold; font-family:monospace;" dir="ltr"><?php echo esc_html($c->phone); ?></div>
                                        <div style="font-size:10px; color:#64748b;"><?php echo esc_html($c->email); ?></div>
                                    </td>
                                    <td>
                                        <div style="font-size:11px;">فیلم: <strong style="color:#4f46e5;"><?php echo esc_html($c->total_movies); ?></strong></div>
                                        <div style="font-size:11px; margin-top:2px;">سریال: <strong style="color:#2563eb;"><?php echo esc_html($c->total_series); ?></strong></div>
                                        <div style="font-size:11px; margin-top:2px; color:#059669;">فروش: <strong><?php echo esc_html($c->total_sales); ?></strong></div>
                                    </td>
                                    <td>
                                        <span style="background:#ede9fe; color:#5b21b6; padding:2px 8px; border-radius:6px; font-weight:bold; font-size:10px;">
                                            v<?php echo esc_html($c->app_version); ?>
                                        </span>
                                        <div style="font-size:9px; color:#94a3b8; margin-top:4px; font-family:monospace;" dir="ltr"><?php echo esc_html($c->os_platform); ?></div>
                                    </td>
                                    <td>
                                        <strong style="font-size:11px; color:#334155;"><?php echo esc_html(human_time_diff($last_seen, time())); ?> قبل</strong>
                                        <div style="font-size:9.5px; color:#94a3b8; margin-top:2.5px; font-family:monospace;"><?php echo esc_html($c->last_heartbeat); ?></div>
                                    </td>
                                    <td>
                                        <?php if ($is_active) : ?>
                                            <span class="pt-badge pt-badge-success">● آنلاین</span>
                                        <?php else : ?>
                                            <span class="pt-badge pt-badge-offline">آفلاین</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>

        <!-- Left Section: Interactive form to config zip updates and release coordinates -->
        <div class="parstech-card">
            <h3 style="font-weight:800; font-size:15px; margin-top:0; margin-bottom:16px; color:#1e293b; display:flex; align-items:center; gap:8px;">
                <span>🚀</span> انتشار بروزرسانی فشرده دسکتاپ (.zip)
            </h3>
            
            <p style="font-size:12px; color:var(--pt-gray-500); line-height:1.6; margin-bottom:20px;">
                میتوانید آخرین فایل فشرده برنامه دسکتاپ را مستقیما آپلود کرده یا لینک دانلود هاست دانلود خود را قرار دهید تا مشتریان از داخل برنامه خود، بصورت خودکار نوتیفیکیشن دریافت کرده و فایل زیپ جدید را دریافت و اعمال نمایند.
            </p>

            <form method="post" action="">
                <?php 
                    wp_nonce_field('save_update_configs', 'mediacenter_nonce');
                ?>

                <div class="form-input-group">
                    <label>شماره نگارش نسخه آخر انتشار یافته (مثال: 1.1.0)</label>
                    <input 
                        type="text" 
                        name="latest_version" 
                        value="<?php echo esc_attr($latest_version); ?>" 
                        class="parstech-input" 
                        style="direction:ltr; font-family:monospace; font-weight:bold;"
                        required
                    />
                </div>

                <div class="form-input-group">
                    <label>فایل فشرده بروزرسانی دسکتاپ</label>
                    <div style="display:flex; gap:8px;">
                        <input 
                            type="text" 
                            id="mediacenter_download_url_input"
                            name="download_url" 
                            value="<?php echo esc_attr($download_url); ?>" 
                            class="parstech-input" 
                            style="flex:1; direction:ltr; font-family:monospace;"
                            required
                        />
                        <button type="button" id="btn_upload_mediacenter_zip" class="button parstech-btn parstech-btn-success" style="font-size:11px; white-space:nowrap; padding:0 16px;">
                            آپلود ZIP...
                        </button>
                    </div>
                    <p style="font-size:9.5px; color:var(--pt-gray-500); margin-top:6px; line-height:1.4;">
                        با کلیک بر روی دکمه "آپلود ZIP" میتوانید فایل فشرده برنامه دسکتاپ را مستقیما در رسانه وردپرس قرار دهید تا آدرس فایل خودکار ثبت گردد.
                    </p>
                </div>

                <div class="form-input-group" style="margin-bottom:24px;">
                    <label>تغییرات و توسعه نگارش جدید (Changelog)</label>
                    <textarea 
                        name="update_changelog" 
                        class="parstech-textarea" 
                        placeholder="توضیحات و امکاناتی که در نگارش جدید اضافه کرده‌اید..."
                        required
                    ><?php echo esc_textarea($update_changelog); ?></textarea>
                </div>

                <button type="submit" name="mediacenter_update_submit" class="parstech-btn parstech-btn-primary" style="width:100%; height:44px; font-size:12.5px;">
                    ذخیره پیکربندی و انتشار بسته‌های زیپ
                </button>
            </form>
        </div>

    </div> <!-- End of .wp-layout-grid -->

    <!-- Section 3: Online Support Tickets Inbox Panel -->
    <div class="parstech-card" style="margin-top: 24px;" id="parstech-tickets-admin-inbox">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:1px solid #f1f5f9; padding-bottom:12px;">
            <h3 style="font-weight:900; font-size:16px; margin:0; color:#1e1b4b; display:flex; align-items:center; gap:8px;">
                <span>💬</span> صندوق پیام‌ها و تیکت‌های پشتیبانی آنلاین کاربران
            </h3>
            <div style="display:flex; gap:8px;">
                <span style="font-size:10.5px; background:#fee2e2; color:#b91c1c; padding:4px 10px; border-radius:6px; font-weight:bold;">
                    <?php echo esc_html($pending_tickets); ?> تیکت بدون پاسخ
                </span>
                <span style="font-size:10.5px; background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:6px; font-weight:bold;">
                    کل تیکت‌ها: <?php echo esc_html($total_tickets); ?>
                </span>
            </div>
        </div>

        <?php if (empty($tickets)) : ?>
            <div style="padding:48px; text-align:center; color:#64748b; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">
                <p style="font-size:13.5px; font-weight:bold; margin-bottom:6px;">هیچ پیام یا تیکت دریافتی وجود ندارد.</p>
                <p style="font-size:11px; margin-top:0;">خریداران و کاربران برنامه می‌توانند مستقیماً از بخش "ارتباط با ما" تیکت بنویسند و فورا اینجا دریافت کنید.</p>
            </div>
        <?php else : ?>
            <div class="parstech-table-wrapper" style="border:none;">
                <?php foreach($tickets as $index => $ticket) : 
                    // Map types
                    $type_label = 'سایر';
                    $type_color = 'background:#f1f5f9; color:#475569;';
                    if ($ticket->message_type === 'problem') {
                        $type_label = 'گزارش مشکل';
                        $type_color = 'background:#fef2f2; color:#991b1b;';
                    } elseif ($ticket->message_type === 'suggestion') {
                        $type_label = 'پیشنهاد';
                        $type_color = 'background:#f5f3ff; color:#5b21b6;';
                    } elseif ($ticket->message_type === 'criticism') {
                        $type_label = 'انتقاد';
                        $type_color = 'background:#fff7ed; color:#c2410c;';
                    }

                    $is_answered = $ticket->status === 'answered';
                ?>
                    <div style="border:1px solid #e2e8f0; border-radius:12px; padding:18px; margin-bottom:16px; background:<?php echo $is_answered ? '#ffffff' : '#fcfcff'; ?>; transition:all 0.2s;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid #f1f5f9; padding-bottom:10px; margin-bottom:12px;">
                            <div>
                                <span style="font-size:10.5px; font-weight:bold; padding:3px 8px; border-radius:6px; margin-left:8px; <?php echo $type_color; ?>">
                                    <?php echo esc_html($type_label); ?>
                                </span>
                                <strong style="font-size:14px; color:#1e293b;"><?php echo esc_html($ticket->subject); ?></strong>
                                <span style="font-size:11px; color:#64748b; margin-right:12px;">توسط: <strong><?php echo esc_html($ticket->full_name); ?></strong> (<?php echo esc_html($ticket->client_id); ?>)</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <span style="font-size:11px; color:#94a3b8;"><?php echo esc_html($ticket->created_at); ?></span>
                                <?php if ($is_answered) : ?>
                                    <span style="background-color:#d1fae5; color:#065f46; font-size:10.5px; font-weight:bold; padding:4px 10px; border-radius:30px;">✓ پاسخ داده شده</span>
                                <?php else : ?>
                                    <span style="background-color:#fef3c7; color:#92400e; font-size:10.5px; font-weight:bold; padding:4px 10px; border-radius:30px; animation: pulse 2s infinite;">در انتظار پاسخ</span>
                                <?php endif; ?>
                            </div>
                        </div>

                        <!-- User complaint content box -->
                        <div style="background:#f8fafc; padding:12px 16px; border-radius:8px; font-size:12px; color:#334155; line-height:1.6; margin-bottom:14px; border-right:3px solid #cbd5e1;">
                            <?php echo nl2br(esc_html($ticket->message)); ?>
                        </div>

                        <!-- Reply box section -->
                        <?php if ($is_answered) : ?>
                            <div style="background:#f0fdf4; padding:12px 16px; border-radius:8px; font-size:12px; color:#166534; line-height:1.6; margin-bottom:14px; border-right:3px solid #4ade80;">
                                <strong style="display:block; margin-bottom:4px; font-size:11px; color:#14532d;">↩ پاسخ پشتیبان در تاریخ <?php echo esc_html($ticket->replied_at); ?>:</strong>
                                <?php echo nl2br(esc_html($ticket->reply)); ?>
                            </div>
                        <?php endif; ?>

                        <!-- Accordion Trigger Button for quick replying -->
                        <div style="text-align:left;">
                            <button type="button" onclick="jQuery('#reply-form-<?php echo $ticket->id; ?>').toggle();" class="button button-small" style="font-size:11px;">
                                <?php echo $is_answered ? '✍ ویرایش پاسخ تیکت' : '💬 ارسال پاسخ مستقیم'; ?>
                            </button>
                        </div>

                        <!-- Reply Form Panel -->
                        <div id="reply-form-<?php echo $ticket->id; ?>" style="display:none; margin-top:14px; padding-top:14px; border-top:1px dashed #cbd5e1;">
                            <form method="post" action="">
                                <?php 
                                    wp_nonce_field('reply_ticket_configs', 'mediacenter_ticket_nonce');
                                ?>
                                <input type="hidden" name="ticket_id" value="<?php echo intval($ticket->id); ?>" />
                                
                                <div class="form-input-group" style="margin-bottom:12px;">
                                    <label style="font-size:11px; font-weight:bold; color:#475569; display:block; margin-bottom:4px;">متن پاسخ به تیکت کاربر (برای نمایش خودکار در برنامه مشتری):</label>
                                    <textarea 
                                        name="reply_text" 
                                        class="parstech-textarea" 
                                        style="height:90px; font-size:11.5px; background:#ffffff;" 
                                        placeholder="پاسخ خود را محترمانه یادداشت کنید. کاربر بر روی دسکتاپ نوتیف پاسخ دریافت خواهد کرد..."
                                        required
                                    ><?php echo $is_answered ? esc_textarea($ticket->reply) : ''; ?></textarea>
                                </div>

                                <div style="text-align:left;">
                                    <button type="button" onclick="jQuery('#reply-form-<?php echo $ticket->id; ?>').hide();" class="parstech-btn parstech-btn-secondary" style="padding:6px 12px; font-size:11px; margin-left:8px;">انصراف</button>
                                    <button type="submit" name="mediacenter_reply_submit" class="parstech-btn parstech-btn-primary" style="padding:6px 16px; font-size:11px;">ثبت پاسخ تیکت</button>
                                </div>
                            </form>
                        </div>

                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

</div> <!-- End of .parstech-wp-container -->
