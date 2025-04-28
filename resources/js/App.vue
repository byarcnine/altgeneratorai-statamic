<template>
  <div class="container">
    <div class="flex items-center justify-between mb-6">
      <h1>Alt Generator AI</h1>
    </div>

    <div class="card">
      <div class="p-4">
        <asset-table
          ref="assetTable"
          :assets="assets"
          :current-page="currentPage"
          :total-pages="totalPages"
          @generate="handleGenerate"
          @approve="handleApprove"
          @bulk-approve="handleBulkApprove"
          @page-changed="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script>
import AssetTable from "./components/AssetTable.vue";
import axios from "axios";

export default {
  name: "App",
  components: {
    AssetTable,
  },
  data() {
    return {
      assets: [],
      currentPage: 1,
      totalPages: 1,
      loading: false,
    };
  },
  created() {
    this.fetchAssets();
  },
  methods: {
    async fetchAssets(page = 1) {
      try {
        this.loading = true;
        const response = await axios.get(
          `/altgeneratorai/assets?page=${page}`,
          {
            headers: {
              "X-CSRF-TOKEN": window.csrf_token,
            },
            withCredentials: true,
          }
        );
        this.assets = response.data.data;
        this.currentPage = response.data.current_page;
        this.totalPages = response.data.last_page;
        console.log([...response.data.data]);
      } catch (error) {
        console.error("Error fetching assets:", error);
      } finally {
        this.loading = false;
      }
    },
    async handleGenerate(assetIds) {
      try {
        const response = await axios.post(
          "/altgeneratorai/generate",
          {
            asset_ids: assetIds,
          },
          {
            headers: {
              "X-CSRF-TOKEN": window.csrf_token,
            },
            withCredentials: true,
          }
        );

        // Update the assets with generated alt text
        this.assets = this.assets.map((asset) => {
          if (assetIds.includes(asset.id)) {
            return {
              ...asset,
              generated_alt: response.data.generated[asset.id],
            };
          }
          return asset;
        });

        // Notify the AssetTable that generation is complete
        this.$refs.assetTable.generationComplete(assetIds);
      } catch (error) {
        console.error("Error generating alt text:", error);
        alert(
          "An error occurred while generating the alt text. Please try again."
        );
        // Make sure to clear loading state even on error
        this.$refs.assetTable.generationComplete(assetIds);
      }
    },
    async handleApprove({ assetId, newAlt }) {
      try {
        await axios.post(
          "/altgeneratorai/approve",
          {
            approvals: {
              [assetId]: newAlt,
            },
          },
          {
            headers: {
              "X-CSRF-TOKEN": window.csrf_token,
            },
            withCredentials: true,
          }
        );

        // Update the asset status
        this.assets = this.assets.map((asset) => {
          if (asset.id === assetId) {
            return {
              ...asset,
              is_approved: true,
            };
          }
          return asset;
        });
      } catch (error) {
        console.error("Error approving alt text:", error);
        alert("An error occurred while approving the alt text.");
      }
    },
    async handleBulkApprove(approvals) {
      try {
        await axios.post("/altgeneratorai/approve", {
          approvals,
        });

        // Update the assets status
        this.assets = this.assets.map((asset) => {
          if (approvals[asset.id]) {
            return {
              ...asset,
              is_approved: true,
            };
          }
          return asset;
        });
      } catch (error) {
        console.error("Error bulk approving alt text:", error);
        alert("An error occurred while bulk approving the alt text.");
      }
    },
    async handlePageChange(page) {
      await this.fetchAssets(page);
    },
  },
};
</script>

<style>
.skeleton-pulse {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.9;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 0.9;
  }
}
</style>
