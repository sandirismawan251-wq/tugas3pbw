(function (global) {
  'use strict';

  global.SITTA = global.SITTA || {};
  global.SITTA.registerDoTracking = function (Vue) {
    // Komponen mencari DO dan menampilkan detail serta riwayat perjalanannya.
    Vue.component('ba-do-tracking', {
      props: {
        records: { type: Array, required: true },
        paketList: { type: Array, required: true },
        focusQuery: { type: String, default: '' }
      },
      data: function () {
        return {
          query: '',
          selectedTracking: null,
          searchSubmitted: false,
          trackingMessage: '',
          progressDraft: { status: 'Dalam Perjalanan', keterangan: '' },
          progressError: ''
        };
      },
      computed: {
        // Pencarian mencocokkan nomor DO, NIM, atau nama pemesan.
        trackingMatches: function () {
          var query = this.query.toLocaleLowerCase('id-ID');
          if (!query) return [];
          return this.records.filter(function (record) {
            return record.nomorDO.toLocaleLowerCase('id-ID').includes(query)
              || String(record.nim).toLocaleLowerCase('id-ID').includes(query)
              || record.nama.toLocaleLowerCase('id-ID').includes(query);
          });
        }
      },
      watch: {
        query: function () {
          this.searchSubmitted = false;
          this.trackingMessage = '';
          if (!this.trackingMatches.some(function (record) {
            return this.selectedTracking && record.nomorDO === this.selectedTracking.nomorDO;
          }, this)) {
            this.selectedTracking = null;
          }
        },
        focusQuery: {
          immediate: true,
          handler: function (query) {
            if (!query) return;
            this.query = query;
            var record = this.records.find(function (item) { return item.nomorDO === query; });
            if (record) this.selectTracking(record);
          }
        }
      },
      methods: {
        submitTrackingSearch: function () {
          this.searchSubmitted = true;
          this.trackingMessage = this.trackingMatches.length
            ? this.trackingMatches.length + ' delivery order ditemukan.'
            : '';
          if (this.trackingMatches.length === 1) this.selectTracking(this.trackingMatches[0]);
        },
        clearTrackingSearch: function () {
          this.query = '';
          this.selectedTracking = null;
          this.trackingMessage = '';
          this.searchSubmitted = false;
        },
        selectTracking: function (record) {
          this.selectedTracking = record;
          this.progressDraft.status = record.status;
          this.progressDraft.keterangan = '';
          this.progressError = '';
        },
        addProgress: function () {
          // Kirim pembaruan ke aplikasi utama setelah keterangan diperiksa.
          this.progressError = '';
          if (!this.selectedTracking) {
            this.progressError = 'Pilih delivery order sebelum menambahkan pembaruan.';
            return;
          }
          if (!this.progressDraft.keterangan.trim()) {
            this.progressError = 'Keterangan perjalanan wajib diisi.';
            return;
          }
          this.$emit('add-progress', {
            record: this.selectedTracking,
            status: this.progressDraft.status,
            keterangan: this.progressDraft.keterangan.trim()
          });
          this.progressDraft.keterangan = '';
        },
        packetName: function (code) {
          var packet = this.paketList.find(function (item) { return item.kode === code; });
          return packet ? packet.nama : code;
        }
      },
      template: global.SITTA.templates.doTracking
    });
  };
}(window));