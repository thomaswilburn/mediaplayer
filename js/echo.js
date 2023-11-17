class EchoChamber extends EventTarget {
  shout(type, detail) {
    // console.log("Echo", type, detail);
    var e = new CustomEvent(type, { detail });
    this.dispatchEvent(e);
  }
}

export var echo = new EchoChamber();