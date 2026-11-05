(function (global) {
  'use strict';

  // Mengambil tanggal hari ini berdasarkan waktu lokal perangkat.
  function localDateValue() {
    var now = new Date();
    var localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }

  global.SITTA = global.SITTA || {};
  global.SITTA.registerOrderForm = function (Vue) {
    // Komponen menampilkan form, memeriksa isian, lalu mengirim pesanan ke aplikasi utama.
    Vue.component('ba-order-form', {
      props: {
        paketList: { type: Array, required: true },
        pengirimanList: { type: Array, required: true },
        stok: { type: Array, required: true },
        message: { type: String, default: '' },
        messageType: { type: String, default: 'success' }
      },
      data: function () {
        return {
          draft: {
            nim: '',
            nama: '',
            paketCode: this.paketList.length ? this.paketList[0].kode : '',
            pengirimanCode: this.pengirimanList.length ? this.pengirimanList[0].kode : '',
            tanggalKirim: localDateValue()
          },
          formError: ''
        };
      },
      computed: {
        selectedPacket: function () {
          return this.paketList.find(function (item) {
            return item.kode === this.draft.paketCode;
          }, this) || null;
        },
        packetItems: function () {
          if (!this.selectedPacket) return [];
          return this.selectedPacket.isi.map(function (code) {
            return this.stok.find(function (item) { return item.kode === code; }) || null;
          }, this);
        }
      },
      watch: {
        'draft.paketCode': function () {
          this.formError = '';
        },
        message: function (value) {
          if (value && this.messageType === 'success') this.resetForm();
        }
      },
      methods: {
        titleFor: function (code) {
          var item = this.stok.find(function (stockItem) { return stockItem.kode === code; });
          return item ? item.judul : 'Judul tidak tersedia';
        },
        resetForm: function () {
          this.draft.nim = '';
          this.draft.nama = '';
          this.draft.paketCode = this.paketList.length ? this.paketList[0].kode : '';
          this.draft.pengirimanCode = this.pengirimanList.length ? this.pengirimanList[0].kode : '';
          this.draft.tanggalKirim = localDateValue();
          this.formError = '';
        },
        submitOrder: function () {
          // Pesanan dikirim hanya jika data pemesan, paket, stok, dan pengiriman valid.
          this.formError = '';
          if (!this.draft.nim.trim() || !this.draft.nama.trim() || !this.selectedPacket
            || !this.draft.pengirimanCode || !this.draft.tanggalKirim) {
            this.formError = 'Lengkapi NIM, nama, paket, jenis pengiriman, dan tanggal kirim.';
            return;
          }
          if (!/^\d+$/.test(this.draft.nim.trim())) {
            this.formError = 'NIM hanya boleh berisi angka.';
            return;
          }
          if (this.packetItems.some(function (item) { return !item; })) {
            this.formError = 'Salah satu bahan ajar dalam paket tidak tersedia pada katalog.';
            return;
          }
          var unavailableItem = this.packetItems.find(function (item) { return item.qty < 1; });
          if (unavailableItem) {
            this.formError = 'Stok ' + unavailableItem.kode + ' sedang habis. Pesanan belum dapat dibuat.';
            return;
          }
          if (!this.pengirimanList.some(function (item) {
            return item.kode === this.draft.pengirimanCode;
          }, this)) {
            this.formError = 'Jenis pengiriman yang dipilih tidak tersedia.';
            return;
          }
          this.$emit('create-order', {
            nim: this.draft.nim.trim(),
            nama: this.draft.nama.trim(),
            paketCode: this.draft.paketCode,
            pengirimanCode: this.draft.pengirimanCode,
            tanggalKirim: this.draft.tanggalKirim
          });
        }
      },
      template: global.SITTA.templates.orderForm
    });
  };
}(window));