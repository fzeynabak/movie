import Swal from 'sweetalert2';

// Create custom Tailwind responsive Toast with RTL support
export const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#1e293b',
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
    // Customize classes to slide in from right and slide out to right smoothly
    showClass: {
      popup: 'swal2-show animate-slice-in-right',
    },
    hideClass: {
      popup: 'swal2-hide animate-slice-out-right',
    },
    customClass: {
      popup: 'rtl-toast shadow-xl rounded-xl border border-gray-150 dark:border-gray-800 font-sans',
      title: 'text-[11px] font-bold leading-normal pr-1',
      timerProgressBar: 'bg-indigo-500'
    }
  });

  Toast.fire({
    icon: type,
    title: message,
  });
};

// Standard Swal Alert Dialog Replacement
export const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', title: string = '') => {
  const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  
  const iconMap = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  } as const;

  return Swal.fire({
    title: title || (type === 'error' ? 'خطا' : type === 'warning' ? 'هشدار' : 'عملیات موفق'),
    text: message,
    icon: iconMap[type],
    confirmButtonText: 'تایید',
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#1e293b',
    confirmButtonColor: '#4f46e5',
    customClass: {
      popup: 'rounded-xl border border-gray-150 dark:border-gray-800 font-sans',
      title: 'text-sm font-black text-gray-900 dark:text-gray-150',
      htmlContainer: 'text-xs text-gray-600 dark:text-gray-300 font-medium',
      confirmButton: 'text-xs font-bold px-6 py-2 rounded-lg'
    }
  });
};

// Confirm dialog replacement
export const showConfirm = (message: string, title: string = 'آیا مطمئن هستید؟') => {
  const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
  
  return Swal.fire({
    title,
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'بله، تایید می‌کنم',
    cancelButtonText: 'انصراف',
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#1e293b',
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: '#ef4444',
    customClass: {
      popup: 'rounded-xl border border-gray-150 dark:border-gray-800 font-sans',
      title: 'text-sm font-black text-gray-900 dark:text-gray-150',
      htmlContainer: 'text-xs text-gray-600 dark:text-gray-300 font-medium',
      confirmButton: 'text-xs font-bold px-4 py-2 rounded-lg',
      cancelButton: 'text-xs font-bold px-4 py-2 rounded-lg'
    }
  });
};
