/**
 * SpoonForce - 2 点线性校准模块
 */
const Calibration = (() => {
  let step = 0; // 0=idle, 1=tare, 2=light, 3=heavy
  let tareForce = 0;
  let point1 = null; // { force, weight }
  let point2 = null;
  let _onStepChange = null;
  let _onComplete = null;

  function start(callback, completeCallback) {
    step = 1;
    tareForce = 0;
    point1 = null;
    point2 = null;
    _onStepChange = callback;
    _onComplete = completeCallback;
    if (_onStepChange) _onStepChange(step);
  }

  function cancel() {
    step = 0;
    _onStepChange = null;
    _onComplete = null;
  }

  function isActive() {
    return step > 0;
  }

  function getStep() {
    return step;
  }

  function nextStep(inputWeight) {
    const currentForce = ForceSensor.getSmoothedForce();

    if (step === 1) {
      // Tare step: record bare spoon force
      if (currentForce < 0.01) {
        return { success: false, error: 'calibNoForce' };
      }
      tareForce = currentForce;
      step = 2;
      if (_onStepChange) _onStepChange(step);
      return { success: true };
    }

    if (step === 2) {
      // Light object
      const weight = parseFloat(inputWeight);
      if (!weight || weight <= 0) {
        return { success: false, error: 'invalidWeight' };
      }
      if (currentForce < 0.01) {
        return { success: false, error: 'calibNoForce' };
      }
      const netForce = currentForce - tareForce;
      if (netForce <= 0.005) {
        return { success: false, error: 'calibNoForce' };
      }
      point1 = { force: netForce, weight };
      step = 3;
      if (_onStepChange) _onStepChange(step);
      return { success: true };
    }

    if (step === 3) {
      // Heavy object
      const weight = parseFloat(inputWeight);
      if (!weight || weight <= 0) {
        return { success: false, error: 'invalidWeight' };
      }
      if (currentForce < 0.01) {
        return { success: false, error: 'calibNoForce' };
      }
      const netForce = currentForce - tareForce;
      if (netForce <= 0.005) {
        return { success: false, error: 'calibNoForce' };
      }
      point2 = { force: netForce, weight };

      // Calculate linear fit: weight = k * netForce + b
      const df = point2.force - point1.force;
      if (Math.abs(df) < 0.01) {
        return { success: false, error: 'pointsTooClose' };
      }
      const k = (point2.weight - point1.weight) / df;
      const b = point1.weight - k * point1.force;
      if (!Number.isFinite(k) || !Number.isFinite(b) || k <= 0) {
        return { success: false, error: 'invalidCalibration' };
      }

      const calibData = {
        k,
        b,
        date: new Date().toISOString(),
        points: [point1, point2],
      };

      Storage.saveCalibration(calibData);
      step = 0;

      if (_onComplete) _onComplete(calibData);
      return { success: true, calibration: calibData };
    }

    return { success: false };
  }

  function calculate(netForce) {
    const cal = Storage.getCalibration();
    const weight = cal.k * netForce + cal.b;
    return Math.max(0, weight);
  }

  return { start, cancel, isActive, getStep, nextStep, calculate };
})();
