import { emojis } from '../config/emojis.js';
import { maskCode, randomId } from '../utils/strings.js';

export class ChallengeService {
  constructor({ captcha }) {
    this.captcha = captcha;
  }

  selectPlan() {
    return {
      manualReview: false,
      steps: [this.createCaptchaStep()],
    };
  }

  createStep() {
    return this.createCaptchaStep();
  }

  createCaptchaStep() {
    const code = this.captcha.generateCode();

    return {
      id: randomId('captcha'),
      type: 'captcha',
      code,
      hint: maskCode(code),
      stage: 'ready',
    };
  }

  async buildCaptchaAsset(step) {
    return this.captcha.render(step.code);
  }

  describeStep() {
    return `${emojis.captcha} Private image captcha`;
  }
}
