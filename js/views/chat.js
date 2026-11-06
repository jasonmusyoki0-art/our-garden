/* 💬 Chat page */
LN.views.chat = {
  render(root) {
    const { util: U, ctx } = LN;
    root.innerHTML = `<h2 class="page-title script">Chat 💬</h2>
      <p class="muted">Just the two of you. ${U.esc(ctx.name(ctx.other))} can chat with you here, or from inside any game.</p>
      <section class="card chatpage"><div id="chatbox"></div></section>`;
    LN.chat.mount(U.$("#chatbox", root));
  }
};
