import { DirectiveBinding, DirectiveOptions } from 'vue/types/options';
export const onlyNumber: DirectiveOptions = {
  bind(el: HTMLInputElement, binding: DirectiveBinding, vnode: any) {
    el.addEventListener('compositionstart', () => {
      vnode.inputLocking = true;
    });
    el.addEventListener('compositionend', () => {
      vnode.inputLocking = false;
      el.dispatchEvent(new Event('input'));
    });
    el.addEventListener('input', () => {
      if (vnode.inputLocking) {
        return;
      }
      const oldValue = el.value;
      let newValue = el.value.replace(/[^\d]/g, '');
      if (newValue) {
        newValue = newValue.toString();
      }
      if (newValue !== oldValue) {
        el.value = newValue;
        el.dispatchEvent(new Event('input'));
      }
    });
  }
};
export const onlyFloat: DirectiveOptions = {
  bind(el: HTMLInputElement, binding: DirectiveBinding, vnode: any) {
    let input = vnode.elm;
    if (input.tagName !== 'INPUT') {
      input = input.querySelector('input');
    }
    if (!input) return;
    input.addEventListener('compositionstart', () => {
      vnode.inputLocking = true;
    });
    input.addEventListener('compositionend', () => {
      vnode.inputLocking = false;
      input.dispatchEvent(new Event('input'));
    });
    input.addEventListener(
      'input',
      (e) => {
        e.preventDefault();
        if (vnode.inputLocking) {
          return;
        }
        const oldValue = input.value;
        let newValue = input.value;
        newValue = newValue.replace(/[^\d.]/g, '');
        newValue = newValue.replace(/^\./g, '');
        newValue = newValue
          .replace('.', '$#$')
          .replace(/\./g, '')
          .replace('$#$', '.');
        const decimal = Number(binding.value) || 0;
        const reg = new RegExp(`^(\\-)*(\\d+)\\.(\\d{${decimal}}).*$`);
        newValue = newValue.replace(reg, '$1$2.$3');
        if (newValue) {
          const arr = newValue.split('.');
          newValue = arr[0] + (arr[1] === undefined ? '' : '.' + arr[1]);
        }
        if (newValue !== oldValue) {
          input.value = newValue;
          input.dispatchEvent(new Event('input'));
        }
      },
      true
    );
    input.addEventListener('blur', () => {
      const oldValue = input.value;
      let newValue = input.value;
      if (newValue) {
        newValue = newValue.toString();
      }
      if (newValue !== oldValue) {
        input.value = newValue;
        input.dispatchEvent(new Event('input'));
      }
    });
  }
};
