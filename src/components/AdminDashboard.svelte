<script lang="ts">
  import { onMount } from 'svelte';

  // Authentication State
  let isAuthenticated = $state(false);
  let usernameInput = $state('');
  let passwordInput = $state('');
  let loginError = $state('');

  // Dashboard State
  let elcinemaId = $state('');
  let loadingElcinema = $state(false);
  let statusMessage = $state('');
  let statusType = $state<'success' | 'error' | ''>('');

  // Item details state
  let contentType = $state<'movie' | 'tv'>('movie');
  let id = $state('');
  let title = $state('');
  let arabicTitle = $state('');
  let slug = $state('');
  let year = $state('2026');
  let lang = $state('ar');
  let genresStr = $state('دراما, أكشن');
  let overview = $state('');
  let posterUrl = $state('');
  let videoUrl = $state('');
  let castStr = $state('');

  // Hierarchical Season & Episodes State for TV Series
  let selectedSeason = $state('1');
  let bulkEpisodesUrls = $state('');

  // Bulk import feedback
  let bulkFeedback = $state('');

  onMount(() => {
    if (localStorage.getItem('ma3ak_admin_auth') === 'true') {
      isAuthenticated = true;
    }
  });

  function handleLogin(e: Event) {
    e.preventDefault();
    if (usernameInput.trim() === 'admin' && passwordInput.trim() === '0182949903') {
      isAuthenticated = true;
      localStorage.setItem('ma3ak_admin_auth', 'true');
      loginError = '';
    } else {
      loginError = 'اسم المستخدم أو كلمة المرور غير صحيحة!';
    }
  }

  function handleLogout() {
    isAuthenticated = false;
    localStorage.removeItem('ma3ak_admin_auth');
    usernameInput = '';
    passwordInput = '';
  }

  async function fetchFromElcinema() {
    if (!elcinemaId.trim()) {
      statusMessage = 'يرجى إدخال ID العمل أو رابط إلمنتصف من elcinema.com';
      statusType = 'error';
      return;
    }

    const cleanedId = elcinemaId.replace(/.*?work\/(\d+).*/, '$1').trim();
    loadingElcinema = true;
    statusMessage = 'جاري سحب بيانات العمل والبوستر من موقع السينما...';
    statusType = '';

    try {
      const res = await fetch('/api/admin/elcinema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanedId }),
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        id = data.id || cleanedId;
        title = data.title || '';
        arabicTitle = data.titleAr || data.title || '';
        slug = data.slug || '';
        contentType = data.type || 'movie';
        year = data.year || '2026';
        genresStr = Array.isArray(data.genres) ? data.genres.join(', ') : '';
        overview = data.overview || '';
        posterUrl = data.poster || '';
        castStr = Array.isArray(data.cast) ? data.cast.join(', ') : '';
        
        statusMessage = `تم سحب البيانات بنجاح! الـ Slug الإنجليزي: (${slug})`;
        statusType = 'success';
      } else {
        statusMessage = data.error || 'حدث خطأ أثناء جلب البيانات من السينما';
        statusType = 'error';
      }
    } catch (err: any) {
      statusMessage = 'فشل الاتصال بخدمة سحب البيانات';
      statusType = 'error';
    } finally {
      loadingElcinema = false;
    }
  }

  async function saveItem() {
    statusMessage = 'جاري حفظ العمل...';
    statusType = '';

    const payload = {
      action: 'save_item',
      item: {
        id: id || Date.now().toString(),
        type: contentType,
        title,
        arabic_title: arabicTitle,
        year,
        lang,
        overview,
        poster: posterUrl,
        videoUrl,
        genres: genresStr.split(',').map(g => g.trim()).filter(Boolean),
        cast: castStr.split(',').map(c => c.trim()).filter(Boolean),
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
      }
    };

    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        statusMessage = data.message || 'تم حفظ المحتوى بنجاح!';
        statusType = 'success';
      } else {
        statusMessage = data.error || 'حدث خطأ أثناء الحفظ';
        statusType = 'error';
      }
    } catch {
      statusMessage = 'فشل الاتصال بخادم الحفظ';
      statusType = 'error';
    }
  }

  async function processBulkEpisodes() {
    if (!bulkEpisodesUrls.trim()) {
      bulkFeedback = 'يرجى إدخال روابط الحلقات أولاً.';
      return;
    }

    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_episodes',
          season: selectedSeason,
          episodesBulk: bulkEpisodesUrls,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        bulkFeedback = `✨ ${data.message}`;
        bulkEpisodesUrls = '';
      } else {
        bulkFeedback = `❌ ${data.error}`;
      }
    } catch {
      bulkFeedback = '❌ فشل الاستيراد الجماعي';
    }
  }
</script>

{#if !isAuthenticated}
  <!-- Login Screen -->
  <div class="min-h-[70vh] flex items-center justify-center py-12 px-4">
    <div class="w-full max-w-md bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-6 backdrop-blur-xl">
      <div class="text-center space-y-2">
        <div class="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h1 class="text-2xl font-black text-white">تسجيل الدخول للوحة التحكم</h1>
        <p class="text-xs text-zinc-500 font-medium">أدخل بيانات المسؤول للوصول لخدمات إدارة المحتوى</p>
      </div>

      <form onsubmit={handleLogin} class="space-y-4">
        <div class="space-y-2">
          <label for="admin-username" class="text-xs font-bold text-zinc-400">اسم المستخدم</label>
          <input
            id="admin-username"
            type="text"
            bind:value={usernameInput}
            placeholder="Username"
            required
            class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-amber-500 transition text-sm"
          />
        </div>

        <div class="space-y-2">
          <label for="admin-password" class="text-xs font-bold text-zinc-400">كلمة المرور</label>
          <input
            id="admin-password"
            type="password"
            bind:value={passwordInput}
            placeholder="Password"
            required
            class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-amber-500 transition text-sm"
          />
        </div>

        {#if loginError}
          <div class="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold text-center">
            {loginError}
          </div>
        {/if}

        <button
          type="submit"
          class="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black py-4 rounded-xl transition shadow-lg text-sm"
        >
          دخول اللوحة
        </button>
      </form>
    </div>
  </div>
{:else}
  <!-- Admin Dashboard Screen -->
  <div class="space-y-10 max-w-6xl mx-auto py-8">

    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800 shadow-2xl backdrop-blur-xl">
      <div>
        <h1 class="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
          <span class="w-3 h-9 bg-amber-500 rounded-full"></span>
          لوحة تحكم إدارة المحتوى (معاك سيما)
        </h1>
        <p class="text-zinc-400 mt-2 font-medium">إضافة وتعديل الأفلام والمسلسلات وسحب البيانات تلقائياً من السينما واستيراد الحلقات دفعة واحدة.</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <button onclick={() => contentType = 'movie'} class={`px-5 py-2.5 rounded-xl font-bold transition border ${contentType === 'movie' ? 'bg-primary text-white border-primary shadow-lg' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
          🎬 إضافة فيلم
        </button>
        <button onclick={() => contentType = 'tv'} class={`px-5 py-2.5 rounded-xl font-bold transition border ${contentType === 'tv' ? 'bg-amber-500 text-black border-amber-400 shadow-lg' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
          📺 إضافة مسلسل
        </button>
        <button onclick={handleLogout} class="px-4 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl border border-red-500/30 transition text-sm font-bold">
          تسجيل الخروج
        </button>
      </div>
    </div>

    <!-- Elcinema Scraper Card -->
    <div class="bg-gradient-to-br from-amber-500/10 via-zinc-900/80 to-zinc-900/90 p-8 rounded-3xl border border-amber-500/30 shadow-2xl space-y-6">
      <div class="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <div class="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        </div>
        <div>
          <h2 class="text-2xl font-black text-white">سحب البيانات والبوستر تلقائياً من elcinema.com</h2>
          <p class="text-xs text-zinc-400 font-medium mt-0.5">أدخل ID العمل (مثال: 2097884) أو رابط صفحة العمل على موقع السينما</p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          bind:value={elcinemaId}
          placeholder="مثال: 2097884 أو https://elcinema.com/work/2097884/"
          class="flex-1 bg-zinc-950 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-white placeholder-zinc-600 font-bold outline-none focus:border-amber-500 transition shadow-inner"
        />
        <button
          onclick={fetchFromElcinema}
          disabled={loadingElcinema}
          class="bg-amber-500 hover:bg-amber-400 text-black font-black px-8 py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          {#if loadingElcinema}
            <div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            جاري الجلب...
          {:else}
            🚀 سحب البيانات والبوستر
          {/if}
        </button>
      </div>

      {#if statusMessage}
        <div class={`p-4 rounded-2xl font-bold text-sm ${statusType === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : statusType === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-zinc-300'}`}>
          {statusMessage}
        </div>
      {/if}
    </div>

    <!-- Main Content Details Form -->
    <div class="bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800 shadow-2xl space-y-8">
      <h2 class="text-2xl font-black text-white border-r-4 border-primary pr-4 flex items-center justify-between">
        <span>معلومات العمل ({contentType === 'movie' ? 'فيلم' : 'مسلسل'})</span>
        {#if posterUrl}
          <span class="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full font-bold">تم تمييز البوستر ✅</span>
        {/if}
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <label for="input-arabic-title" class="text-sm font-bold text-zinc-400">العنوان بالعربية</label>
          <input id="input-arabic-title" type="text" bind:value={arabicTitle} placeholder="اسم العمل بالعربي" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-primary transition" />
        </div>

        <div class="space-y-2">
          <label for="input-original-title" class="text-sm font-bold text-zinc-400">العنوان الأصلي / الإنجليزي</label>
          <input id="input-original-title" type="text" bind:value={title} placeholder="Title in English" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-primary transition" />
        </div>

        <div class="space-y-2">
          <label for="input-slug" class="text-sm font-bold text-amber-400">رابط الـ Slug (لاتيني / إنجليزي)</label>
          <input id="input-slug" type="text" bind:value={slug} placeholder="el-qessa-el-kamla" class="w-full bg-zinc-950 border border-amber-500/40 rounded-xl p-4 text-amber-300 font-mono font-bold outline-none focus:border-amber-400 transition" />
        </div>

        <div class="space-y-2">
          <label for="input-year" class="text-sm font-bold text-zinc-400">سنة الإنتاج</label>
          <input id="input-year" type="text" bind:value={year} placeholder="2026" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-primary transition" />
        </div>

        <div class="space-y-2">
          <label for="input-genres" class="text-sm font-bold text-zinc-400">التصنيفات (مفصولة بفاصلة)</label>
          <input id="input-genres" type="text" bind:value={genresStr} placeholder="دراما, أكشن, كوميديا" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-primary transition" />
        </div>

        <div class="space-y-2 md:col-span-2">
          <label for="input-poster-url" class="text-sm font-bold text-zinc-400">رابط البوستر (Poster Image URL)</label>
          <div class="flex gap-4 items-center">
            <input id="input-poster-url" type="text" bind:value={posterUrl} placeholder="https://media.elcinema.com/..." class="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-primary transition" />
            {#if posterUrl}
              <img src={posterUrl} alt="Poster preview" class="w-14 h-20 object-cover rounded-xl border border-zinc-700 shadow-md shrink-0" />
            {/if}
          </div>
        </div>

        <div class="space-y-2 md:col-span-2">
          <label for="input-cast" class="text-sm font-bold text-zinc-400">طاقم العمل والتمثيل (مفصولة بفاصلة)</label>
          <input id="input-cast" type="text" bind:value={castStr} placeholder="أحمد عز, كريم عبد العزيز..." class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-primary transition" />
        </div>

        <div class="space-y-2 md:col-span-2">
          <label for="input-overview" class="text-sm font-bold text-zinc-400">قصة العمل (Overview)</label>
          <textarea id="input-overview" bind:value={overview} rows="4" placeholder="ملخص وقصة الفيلم/المسلسل..." class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-medium outline-none focus:border-primary transition leading-relaxed"></textarea>
        </div>

        {#if contentType === 'movie'}
          <div class="space-y-2 md:col-span-2">
            <label for="input-video-url" class="text-sm font-bold text-zinc-400">رابط فيديو الفيلم (Direct Stream / MP4 / M3U8)</label>
            <input id="input-video-url" type="text" bind:value={videoUrl} placeholder="https://s001.mogcdn.com/movies/..." class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-primary transition" />
          </div>
        {/if}
      </div>

      <!-- Hierarchical Season & Bulk Episodes Management (For TV Shows) -->
      {#if contentType === 'tv'}
        <div class="mt-10 p-8 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-6">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h3 class="text-xl font-black text-amber-400 flex items-center gap-2">
              <span>📺 إدارة المواسم والحلقات (Bulk Import)</span>
            </h3>
            <div class="flex items-center gap-3">
              <label for="select-season" class="text-xs text-zinc-400 font-bold">اختر الموسم:</label>
              <select id="select-season" bind:value={selectedSeason} class="bg-zinc-900 border border-zinc-700 text-white font-bold rounded-xl px-4 py-2 outline-none">
                <option value="1">الموسم 1</option>
                <option value="2">الموسم 2</option>
                <option value="3">الموسم 3</option>
                <option value="4">الموسم 4</option>
              </select>
            </div>
          </div>

          <div class="space-y-3">
            <label for="input-bulk-episodes" class="text-sm font-bold text-zinc-300">إضافة الحلقات دفعة واحدة (Bulk Import URLs)</label>
            <p class="text-xs text-zinc-500">أدخل كل رابط حلقة في سطر منفرد، أو بتنسيق (رقم الحلقة | الرابط). مثال:</p>
            <div class="bg-zinc-900 p-3 rounded-xl text-xs text-amber-300 font-mono">
              1 | https://cdn.com/show/s01e01.mp4<br/>
              2 | https://cdn.com/show/s01e02.mp4
            </div>
            <textarea
              id="input-bulk-episodes"
              bind:value={bulkEpisodesUrls}
              rows="6"
              placeholder="أدخل الروابط هنا سطر بسطر..."
              class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white font-mono text-sm outline-none focus:border-amber-500 transition"
            ></textarea>
          </div>

          <div class="flex justify-between items-center">
            <button
              onclick={processBulkEpisodes}
              class="bg-amber-500 hover:bg-amber-400 text-black font-black px-6 py-3 rounded-xl transition shadow-md"
            >
              ⚡ استيراد الحلقات لـ الموسم {selectedSeason}
            </button>
            {#if bulkFeedback}
              <span class="text-sm font-bold text-amber-300">{bulkFeedback}</span>
            {/if}
          </div>
        </div>
      {/if}

      <div class="pt-4 flex justify-end">
        <button
          onclick={saveItem}
          class="bg-primary hover:bg-blue-600 text-white font-black px-12 py-4 rounded-2xl transition shadow-xl text-lg hover:-translate-y-1"
        >
          حفظ البيانات والتنفيذ
        </button>
      </div>
    </div>

  </div>
{/if}
