(function () {
  'use strict';

  var appRoot = document.getElementById('app');
  var errorPanel = document.getElementById('app-error');

  // Tampilkan pesan jika aplikasi gagal dimulai.
  function showStartupError(message) {
    appRoot.hidden = true;
    errorPanel.hidden = false;
    errorPanel.textContent = message;
  }

  // Mengubah angka dan tanggal ke tampilan yang mudah dibaca.
  function registerFilters(Vue) {
    Vue.filter('currency', function (value) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(Number(value) || 0);
    });

    Vue.filter('number', function (value) {
      return new Intl.NumberFormat('id-ID').format(Number(value) || 0);
    });

    Vue.filter('stockUnit', function (value) {
      return new Intl.NumberFormat('id-ID').format(Number(value) || 0) + ' buah';
    });

    Vue.filter('date', function (value) {
      if (!value) return '-';
      var date = new Date(value + 'T00:00:00');
      return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date);
    });
  }

  // Membuat waktu lokal untuk riwayat pengiriman.
  function localTimestamp() {
    var now = new Date();
    var localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 19).replace('T', ' ');
  }

  // Mengubah data tracking dari JSON menjadi daftar delivery order.
  function normalizeTracking(tracking) {
    var uniqueRecords = new Map();
    (tracking || []).forEach(function (entry) {
      Object.keys(entry).forEach(function (number) {
        var record = entry[number];
        uniqueRecords.set(number, Object.assign({}, record, {
          nomorDO: number,
          perjalanan: Array.isArray(record.perjalanan) ? record.perjalanan.slice() : []
        }));
      });
    });
    return Array.from(uniqueRecords.values());
  }

  // Memastikan daftar utama tersedia sebelum aplikasi dijalankan.
  function validateCatalog(catalog) {
    if (!catalog || !Array.isArray(catalog.stok) || !Array.isArray(catalog.paket)
      || !Array.isArray(catalog.upbjjList) || !Array.isArray(catalog.kategoriList)
      || !Array.isArray(catalog.pengirimanList)) {
      throw new Error('Data katalog tidak memiliki daftar stok, paket, UPBJJ, kategori, dan pengiriman yang valid.');
    }
  }

  // Menyiapkan data bersama dan fungsi utama aplikasi.
  function createApp(catalog) {
    validateCatalog(catalog);
    var initialTracking = normalizeTracking(catalog.tracking);

    new Vue({
      el: '#app',
      data: function () {
        return {
          activeTab: 'dashboard',
          stok: catalog.stok,
          upbjjList: catalog.upbjjList,
          kategoriList: catalog.kategoriList,
          pengirimanList: catalog.pengirimanList,
          paketList: catalog.paket,
          trackingRecords: initialTracking,
          trackingFocus: '',
          orderMessage: '',
          orderMessageType: 'success'
        };
      },
      computed: {
        lowStockItems: function () {
          return this.stok.filter(function (item) {
            return item.qty < item.safety;
          });
        },
        lowStockCount: function () {
          return this.lowStockItems.length;
        }
      },
      watch: {
        activeTab: function (newTab) {
          if (newTab !== 'tracking') this.trackingFocus = '';
          if (newTab !== 'tracking' && newTab !== 'orders') {
            this.orderMessage = '';
          }
        }
      },
      methods: {
        createStock: function (stock) {
          this.stok.push(stock);
        },
        updateStock: function (change) {
          var index = this.stok.findIndex(function (item) {
            return item.kode === change.previousCode;
          });
          if (index !== -1) this.$set(this.stok, index, change.stock);
        },
        deleteStock: function (code) {
          var index = this.stok.findIndex(function (item) { return item.kode === code; });
          if (index !== -1) this.stok.splice(index, 1);
        },
        createOrder: function (draft) {
          // Pesanan hanya dibuat jika paket, pengiriman, dan stoknya valid.
          this.orderMessage = '';
          this.orderMessageType = 'error';

          var packet = this.paketList.find(function (item) { return item.kode === draft.paketCode; });
          var shipping = this.pengirimanList.find(function (item) {
            return item.kode === draft.pengirimanCode;
          });
          if (!packet || !shipping) {
            this.orderMessage = 'Paket atau jenis pengiriman yang dipilih tidak tersedia.';
            return;
          }

          var packetItems = packet.isi.map(function (code) {
            return this.stok.find(function (item) { return item.kode === code; });
          }, this);
          if (packetItems.some(function (item) { return !item; })) {
            this.orderMessage = 'Paket berisi kode bahan ajar yang tidak ditemukan pada katalog.';
            return;
          }
          var unavailableItem = packetItems.find(function (item) { return item.qty < 1; });
          if (unavailableItem) {
            this.orderMessage = 'Stok ' + unavailableItem.kode + ' sedang habis. Pesanan belum dapat dibuat.';
            return;
          }

          var year = new Date().getFullYear();
          var sequence = this.trackingRecords.reduce(function (highest, record) {
            var match = record.nomorDO.match(/^DO(\d{4})-(\d+)$/);
            return match && Number(match[1]) === year
              ? Math.max(highest, Number(match[2]))
              : highest;
          }, 0) + 1;
          var number = 'DO' + year + '-' + String(sequence).padStart(3, '0');
          var order = {
            nomorDO: number,
            nim: draft.nim,
            nama: draft.nama,
            status: 'Dalam Perjalanan',
            ekspedisi: shipping.nama,
            tanggalKirim: draft.tanggalKirim,
            paket: packet.kode,
            total: packet.harga,
            perjalanan: [{
              waktu: localTimestamp(),
              keterangan: 'Delivery order dibuat'
            }]
          };

          packetItems.forEach(function (item) {
            item.qty -= 1;
          });
          this.trackingRecords.unshift(order);
          this.trackingFocus = number;
          this.orderMessage = 'Pesanan berhasil dibuat. Nomor delivery order: ' + number + '.';
          this.orderMessageType = 'success';
          this.activeTab = 'tracking';
        },
        addProgress: function (update) {
          // Menambahkan catatan perjalanan dan memperbarui status DO.
          update.record.perjalanan.push({
            waktu: localTimestamp(),
            keterangan: update.keterangan
          });
          update.record.status = update.status;
        }
      }
    });
  }

  // Urutan awal: cek Vue, muat data dan template, daftarkan komponen, lalu tampilkan aplikasi.
  if (!window.Vue) {
    showStartupError('Vue.js tidak berhasil dimuat. Periksa koneksi internet, lalu muat ulang halaman.');
    return;
  }

  registerFilters(window.Vue);
  window.SITTA.loadAppData()
    .then(function (catalog) {
      window.SITTA.registerStatusComponents(window.Vue);
      window.SITTA.registerModalComponent(window.Vue);
      window.SITTA.registerStockTable(window.Vue);
      window.SITTA.registerOrderForm(window.Vue);
      window.SITTA.registerDoTracking(window.Vue);
      createApp(catalog);
    })
    .catch(function (error) {
      console.error('SITTA tidak dapat dimulai:', error);
      showStartupError(
        'Data aplikasi gagal dimuat. Jalankan proyek melalui server lokal (misalnya Live Server di VS Code), ' +
        'pastikan seluruh file data dan template tersedia, lalu muat ulang halaman. ' + error.message
      );
    });
}());
