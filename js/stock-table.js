(function (global) {
  'use strict';

  global.SITTA = global.SITTA || {};
  global.SITTA.registerStockTable = function (Vue) {
    // Komponen mengatur pencarian, filter, pengurutan, dan perubahan data stok.
    Vue.component('ba-stock-table', {
      props: {
        stocks: { type: Array, required: true },
        upbjjList: { type: Array, required: true },
        kategoriList: { type: Array, required: true }
      },
      data: function () {
        return {
          search: '',
          selectedUpbjj: '',
          selectedCategory: '',
          stockCondition: '',
          sortBy: 'judul-asc',
          modalMode: '',
          draft: this.emptyDraft(),
          originalCode: '',
          deleteTarget: null,
          formError: ''
        };
      },
      computed: {
        // Kategori yang tersedia mengikuti UPBJJ yang dipilih.
        availableCategories: function () {
          if (!this.selectedUpbjj) return this.kategoriList;
          var categories = this.stocks.filter(function (item) {
            return item.upbjj === this.selectedUpbjj;
          }, this).map(function (item) {
            return item.kategori;
          });
          return this.kategoriList.filter(function (category) {
            return categories.indexOf(category) !== -1;
          });
        },
        // Menyaring dahulu, lalu mengurutkan daftar stok.
        filteredStocks: function () {
          var query = this.search.toLocaleLowerCase('id-ID');
          var items = this.stocks.filter(function (item) {
            var matchesText = !query
              || item.kode.toLocaleLowerCase('id-ID').includes(query)
              || item.judul.toLocaleLowerCase('id-ID').includes(query);
            var matchesUpbjj = !this.selectedUpbjj || item.upbjj === this.selectedUpbjj;
            var matchesCategory = !this.selectedCategory || item.kategori === this.selectedCategory;
            var matchesCondition = !this.stockCondition
              || (this.stockCondition === 'low' && item.qty < item.safety)
              || (this.stockCondition === 'empty' && item.qty === 0)
              || (this.stockCondition === 'safe' && item.qty >= item.safety);
            return matchesText && matchesUpbjj && matchesCategory && matchesCondition;
          }, this);
          var parts = this.sortBy.split('-');
          var field = parts[0];
          var direction = parts[1] === 'desc' ? -1 : 1;
          return items.slice().sort(function (left, right) {
            var first = left[field];
            var second = right[field];
            var comparison = typeof first === 'number'
              ? first - second
              : String(first).localeCompare(String(second), 'id-ID', { sensitivity: 'base' });
            return comparison * direction;
          });
        },
        isEditing: function () {
          return this.modalMode === 'edit';
        }
      },
      watch: {
        selectedUpbjj: function () {
          if (this.selectedCategory && this.availableCategories.indexOf(this.selectedCategory) === -1) {
            this.selectedCategory = '';
          }
        }
      },
      methods: {
        emptyDraft: function () {
          return {
            kode: '',
            judul: '',
            kategori: '',
            upbjj: '',
            lokasiRak: '',
            harga: '',
            qty: '',
            safety: '',
            catatanHTML: ''
          };
        },
        resetFilters: function () {
          this.search = '';
          this.selectedUpbjj = '';
          this.selectedCategory = '';
          this.stockCondition = '';
          this.sortBy = 'judul-asc';
        },
        openCreate: function () {
          this.draft = this.emptyDraft();
          this.originalCode = '';
          this.formError = '';
          this.modalMode = 'create';
        },
        openEdit: function (item) {
          this.draft = Object.assign({}, item);
          this.originalCode = item.kode;
          this.formError = '';
          this.modalMode = 'edit';
        },
        closeModal: function () {
          this.modalMode = '';
          this.formError = '';
        },
        saveStock: function () {
          // Periksa isian, angka, dan kode unik sebelum mengirim perubahan ke aplikasi utama.
          this.formError = '';
          this.draft.kode = String(this.draft.kode || '').trim().toUpperCase();
          this.draft.judul = String(this.draft.judul || '').trim();
          this.draft.lokasiRak = String(this.draft.lokasiRak || '').trim();
          this.draft.catatanHTML = String(this.draft.catatanHTML || '').trim();

          if (!this.draft.kode || !this.draft.judul || !this.draft.kategori
            || !this.draft.upbjj || !this.draft.lokasiRak) {
            this.formError = 'Lengkapi kode, judul, kategori, UPBJJ, dan lokasi rak.';
            return;
          }
          if ([this.draft.harga, this.draft.qty, this.draft.safety].some(function (value) {
            return value === '' || !Number.isFinite(Number(value)) || Number(value) < 0;
          })) {
            this.formError = 'Harga, jumlah stok, dan safety stock harus berupa angka nol atau lebih.';
            return;
          }
          if (this.stocks.some(function (item) {
            return item.kode === this.draft.kode && item.kode !== this.originalCode;
          }, this)) {
            this.formError = 'Kode bahan ajar sudah digunakan.';
            return;
          }

          var stock = Object.assign({}, this.draft, {
            harga: Number(this.draft.harga),
            qty: Number(this.draft.qty),
            safety: Number(this.draft.safety)
          });
          if (this.isEditing) {
            this.$emit('stock-update', { previousCode: this.originalCode, stock: stock });
          } else {
            this.$emit('stock-create', stock);
          }
          this.closeModal();
        },
        confirmDelete: function (item) {
          this.deleteTarget = item;
        },
        deleteStock: function () {
          if (!this.deleteTarget) return;
          this.$emit('stock-delete', this.deleteTarget.kode);
          this.deleteTarget = null;
        },
        safeNote: function (value) {
          // Catatan hanya boleh menampilkan teks dan beberapa tag format yang diizinkan.
          return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/&lt;(\/?)(em|strong|u|i)&gt;/gi, '<$1$2>');
        },
        plainNote: function (value) {
          return String(value || '').replace(/<[^>]*>/g, '');
        }
      },
      template: global.SITTA.templates.stockTable
    });
  };
}(window));