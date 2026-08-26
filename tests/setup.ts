import { enableColors } from '@/cli/utils/colors.ts';

// Colors default to on, and the color state is module-global. View tests assert raw strings, so
// whether they passed used to depend on some earlier test file happening to call createOutput with
// --no-colors first — they failed when run alone or per-directory. Switch colors off for every run.
enableColors(false);
