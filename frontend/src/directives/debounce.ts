import { DirectiveOptions } from 'vue/types/options';
export const debounce: DirectiveOptions = {
  bind(el, binding) {
    let timer: number;
    el.addEventListener('click', () => {
      timer && clearTimeout(timer);
      timer = window.setTimeout(() => binding.value(), 300);
    });
  }
};
