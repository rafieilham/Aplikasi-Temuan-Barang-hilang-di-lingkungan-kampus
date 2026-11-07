/**
 * FoundIt! Polibatam - Sistem Notifikasi Terpadu (In-App & WhatsApp Notification)
 * Mendukung notifikasi real-time status laporan, verifikasi klaim, dan himbauan keamanan kampus.
 */

(function () {
  // 1. Inject CSS Khusus Dropdown Notifikasi
  const notifStyle = document.createElement('style');
  notifStyle.id = 'foundit-notif-styles';
  notifStyle.textContent = `
    .notif-wrapper {
      position: relative;
      display: inline-block;
    }
    .notif-badge-count {
      position: absolute;
      top: -4px;
      right: -4px;
      background-color: #ef4444;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 800;
      min-width: 19px;
      height: 19px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    }
    .notif-popup {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 360px;
      max-width: 90vw;
      background: #ffffff;
      border-radius: 16px;
      border: 1.5px solid #e2e8f0;
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
      z-index: 1060;
      overflow: hidden;
      display: none;
      animation: notifFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes notifFadeIn {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .notif-popup.show {
      display: block;
    }
    .notif-popup-header {
      padding: 14px 18px;
      border-bottom: 1.5px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
    }
    .notif-popup-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }
    .btn-mark-read {
      font-size: 0.8rem;
      font-weight: 600;
      color: #0f8a77;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
      transition: background 0.15s ease;
    }
    .btn-mark-read:hover {
      background: #f0fdf9;
      text-decoration: underline;
    }
    .notif-popup-body {
      max-height: 380px;
      overflow-y: auto;
      padding: 8px 0;
    }
    .notif-item {
      padding: 12px 18px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      text-decoration: none;
      color: inherit;
      border-bottom: 1px solid #f8fafc;
      transition: background 0.15s ease;
      cursor: pointer;
    }
    .notif-item:hover {
      background-color: #f8fafc;
    }
    .notif-item.unread {
      background-color: #f0fdfa;
    }
    .notif-item.unread:hover {
      background-color: #e6fcf5;
    }
    .notif-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.1rem;
    }
    .notif-icon-success { background: #dcfce7; color: #15803d; }
    .notif-icon-info { background: #e0f2fe; color: #0284c7; }
    .notif-icon-warning { background: #fef3c7; color: #b45309; }
    .notif-icon-danger { background: #fee2e2; color: #dc2626; }
    .notif-content {
      flex: 1;
      min-width: 0;
    }
    .notif-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .notif-item-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }
    .notif-item-time {
      font-size: 0.72rem;
      color: #94a3b8;
      white-space: nowrap;
      margin-left: 6px;
    }
    .notif-item-desc {
      font-size: 0.82rem;
      color: #64748b;
      line-height: 1.35;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .notif-popup-footer {
      padding: 10px 16px;
      border-top: 1.5px solid #f1f5f9;
      text-align: center;
      background: #f8fafc;
    }
    .notif-footer-link {
      font-size: 0.86rem;
      font-weight: 700;
      color: #0f8a77;
      text-decoration: none;
    }
    .notif-footer-link:hover {
      text-decoration: underline;
    }
    .notif-empty {
      padding: 32px 20px;
      text-align: center;
      color: #94a3b8;
    }
    .notif-empty svg {
      margin-bottom: 8px;
      opacity: 0.6;
    }
  `;
  document.head.appendChild(notifStyle);

  // 2. Inisialisasi saat Halaman Selesai Dimuat
  window.addEventListener('DOMContentLoaded', () => {
    initNotificationBell();
  });

  async function initNotificationBell() {
    const bellBtn = document.querySelector('.btn-notification');
    if (!bellBtn) return;

    // Bungkus bell button ke dalam wrapper
    let wrapper = bellBtn.parentElement;
    if (!wrapper.classList.contains('notif-wrapper')) {
      const newWrapper = document.createElement('div');
      newWrapper.className = 'notif-wrapper';
      bellBtn.parentNode.insertBefore(newWrapper, bellBtn);
      newWrapper.appendChild(bellBtn);
      wrapper = newWrapper;
    }

    // Buat Popup Dropdown
    let popup = wrapper.querySelector('.notif-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'notif-popup';
      popup.innerHTML = `
        <div class="notif-popup-header">
          <div class="notif-popup-title">
            <span>Notifikasi</span>
            <span class="badge bg-danger rounded-pill px-2 py-0.5" id="notifHeaderCount" style="font-size: 0.72rem; display: none;">0 Baru</span>
          </div>
          <button type="button" class="btn-mark-read" onclick="markAllNotificationsAsRead()">
            Tandai Dibaca
          </button>
        </div>
        <div class="notif-popup-body" id="notifListContainer">
          <div class="notif-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <div class="small fw-semibold">Memuat notifikasi...</div>
          </div>
        </div>
        <div class="notif-popup-footer">
          <a href="laporan_saya.html" class="notif-footer-link">Lihat Semua Laporan Saya &rarr;</a>
        </div>
      `;
      wrapper.appendChild(popup);
    }

    // Event Listener Klik Bell
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = popup.classList.contains('show');
      closeAllPopups();
      if (!isOpen) {
        popup.classList.add('show');
      }
    });

    // Tutup popup jika klik di luar
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        popup.classList.remove('show');
      }
    });

    // Muat data notifikasi
    await loadNotifications(wrapper);
  }

  function closeAllPopups() {
    document.querySelectorAll('.notif-popup').forEach(p => p.classList.remove('show'));
  }

  // 3. Menghasilkan Notifikasi Cerdas Berdasarkan Sesi Pengguna & Database
  async function loadNotifications(wrapper) {
    const listContainer = wrapper.querySelector('#notifListContainer');
    const headerCount = wrapper.querySelector('#notifHeaderCount');
    const bellBtn = wrapper.querySelector('.btn-notification');
    const notifDot = bellBtn.querySelector('.notif-dot');

    const session = JSON.parse(localStorage.getItem('foundit_session') || 'null');
    const readIds = JSON.parse(localStorage.getItem('foundit_read_notifs') || '[]');

    const notifs = [];

    // Notifikasi Sistem 1: Hotspot Kampus Polibatam
    notifs.push({
      id: 'hotspot-info',
      type: 'warning',
      iconClass: 'notif-icon-warning',
      iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
      title: 'Pantauan Keamanan K3 Kampus',
      desc: 'Waspada kehilangan barang di Gedung PES / Gedung Utama (GU) dan Tower A pada jam pergantian perkuliahan.',
      time: 'Hari ini',
      url: 'daftar_laporan.html'
    });

    // Jika pengguna login, cek status laporan & klaim miliknya
    if (session && window.supabaseClient) {
      try {
        const { data: userItems } = await supabaseClient
          .from('items')
          .select('*')
          .or(`pelapor_id.eq.${session.id},klaim_nim.eq.${session.nim}`)
          .order('id', { ascending: false });

        if (userItems && userItems.length > 0) {
          userItems.forEach(it => {
            const isMyClaim = String(it.klaim_nim) === String(session.nim);
            const isMyReport = String(it.pelapor_id) === String(session.id);
            const st = (it.status || '').toLowerCase();

            // Notifikasi Klaim Disetujui (Status dikembalikan)
            if (isMyClaim && st === 'dikembalikan') {
              notifs.unshift({
                id: `claim-approved-${it.id}`,
                type: 'success',
                iconClass: 'notif-icon-success',
                iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
                title: '🎉 Klaim Kepemilikan Disetujui!',
                desc: `Klaim Anda untuk "${it.nama_barang}" telah diverifikasi oleh Petugas K3. Silakan ambil barang di Gedung PES / GU Lantai 1.`,
                time: 'Baru saja',
                url: `detail_barang.html?id=${it.id}`
              });
            }
            // Notifikasi Klaim Sedang Ditinjau (Status cocok/ditemukan)
            else if (isMyClaim && st === 'cocok/ditemukan') {
              notifs.unshift({
                id: `claim-process-${it.id}`,
                type: 'info',
                iconClass: 'notif-icon-info',
                iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
                title: '⏳ Klaim Sedang Diverifikasi',
                desc: `Bukti klaim Anda untuk "${it.nama_barang}" sedang ditinjau oleh administrator posko kampus.`,
                time: 'Terkini',
                url: `detail_barang.html?id=${it.id}`
              });
            }
            // Notifikasi Laporan Temuan Ada yang Mengklaim
            else if (isMyReport && (it.klaim_nim || st === 'cocok/ditemukan')) {
              notifs.push({
                id: `report-claimed-${it.id}`,
                type: 'info',
                iconClass: 'notif-icon-info',
                iconSvg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>',
                title: '🔍 Ada Pengajuan Klaim Barang',
                desc: `Barang "${it.nama_barang}" yang Anda laporkan sedang dalam tahap verifikasi klaim pemilik sah.`,
                time: 'Terkini',
                url: `detail_barang.html?id=${it.id}`
              });
            }
          });
        }
      } catch (err) {
        console.warn('Gagal memuat notifikasi real-time dari DB:', err);
      }
    }

    // Hitung Notifikasi Belum Dibaca
    const unreadList = notifs.filter(n => !readIds.includes(n.id));
    const unreadCount = unreadList.length;

    // Render badge & dot lonceng
    if (unreadCount > 0) {
      if (notifDot) notifDot.style.display = 'block';
      let countBadge = bellBtn.querySelector('.notif-badge-count');
      if (!countBadge) {
        countBadge = document.createElement('span');
        countBadge.className = 'notif-badge-count';
        bellBtn.appendChild(countBadge);
      }
      countBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      countBadge.style.display = 'flex';

      headerCount.textContent = `${unreadCount} Baru`;
      headerCount.style.display = 'inline-block';
    } else {
      if (notifDot) notifDot.style.display = 'none';
      const countBadge = bellBtn.querySelector('.notif-badge-count');
      if (countBadge) countBadge.style.display = 'none';
      headerCount.style.display = 'none';
    }

    // Render Daftar Notifikasi
    if (notifs.length === 0) {
      listContainer.innerHTML = `
        <div class="notif-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <div class="small fw-semibold">Tidak ada notifikasi saat ini</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = notifs.map(n => {
      const isUnread = !readIds.includes(n.id);
      return `
        <a href="${n.url}" class="notif-item ${isUnread ? 'unread' : ''}" onclick="markSingleNotifAsRead('${n.id}')">
          <div class="notif-icon-box ${n.iconClass}">
            ${n.iconSvg}
          </div>
          <div class="notif-content">
            <div class="notif-title-row">
              <h6 class="notif-item-title">${n.title}</h6>
              <span class="notif-item-time">${n.time}</span>
            </div>
            <p class="notif-item-desc">${n.desc}</p>
          </div>
        </a>
      `;
    }).join('');
  }

  // 4. Fungsi Tandai Notifikasi Dibaca
  window.markAllNotificationsAsRead = function () {
    const session = JSON.parse(localStorage.getItem('foundit_session') || 'null');
    const readIds = ['hotspot-info'];
    document.querySelectorAll('.notif-item').forEach(el => {
      el.classList.remove('unread');
    });
    // Kumpulkan semua id yang ada di DOM
    const links = document.querySelectorAll('.notif-item');
    links.forEach(l => {
      const match = l.getAttribute('onclick')?.match(/'([^']+)'/);
      if (match) readIds.push(match[1]);
    });
    localStorage.setItem('foundit_read_notifs', JSON.stringify(Array.from(new Set(readIds))));

    // Hilangkan dot dan badge
    document.querySelectorAll('.notif-dot').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.notif-badge-count').forEach(b => b.style.display = 'none');
    const headerCount = document.getElementById('notifHeaderCount');
    if (headerCount) headerCount.style.display = 'none';
  };

  window.markSingleNotifAsRead = function (id) {
    const readIds = JSON.parse(localStorage.getItem('foundit_read_notifs') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('foundit_read_notifs', JSON.stringify(readIds));
    }
  };
})();
