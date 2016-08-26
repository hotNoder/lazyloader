/***********************************
  策略： 每加载完一屏，就加载后一屏，最多提前加载M屏
        翻到第几屏，就加载第几屏，加载完开始加载后面M屏

************************************/
class LazyQueue {
  static updateSign(newSign) {
    LazyQueue.newSign = newSign
  }

  constructor(order) {
    this.order = order
    this.sign = '_' + order
    LazyQueue.updateSign(this.sign)
  }
}
// 静态属性，用来记录最新的队列序号
LazyQueue.newSign = '_0'

const M = 2


class Lazyloader {
  /*
    @ content                 元素列表
    @ screenHeight            设备屏幕高度转为画布上的高度，按此值分屏
    @ currentViewScreenIndex  当前用户所处第几屏，随window.scroll改变
    @ screenBox               存放各屏中需要懒加载的元素
    @ screenBoxNum            存放屏序列下标
    @ maxScreenIndex          最大屏号
    @ loading                 正在加载的屏序列（非预加载的）
    $ needLazyTypes           需要懒加载的类型列表(这里示例图片)
  */
  constructor(content, screenHeight) {
    this.content = content
    this.screenHeight = screenHeight
    this.currentViewScreenIndex = 0
    this.needLazyTypes = ['img']
    this.screenBox = {}
    this.screenBoxNum = [0]
    this.maxScreenIndex = 0
    this.loading = []
    this.init()
  }

  init() {
    let screenHeight = this.screenHeight
    let needLazyTypes = this.needLazyTypes
    let content = this.content
    let number = content.length
    let element
    let screenNum         // 第几屏
    let screenBox = {}

    // 分屏存放需要懒加载的元素
    for (let i = 0; i < number; i += 1) {
      element = content[i]
      if (needLazyTypes.indexOf(element.type) > -1) {
        screenNum = Math.floor((element.top < 0 ? 0 : element.top) / screenHeight)
        screenBox[screenNum] = screenBox[screenNum] || []
        screenBox[screenNum].push(element)
      }
      else {
        // 不需要加载资源
      }
    }

    this.screenBox = screenBox
    this.screenBoxNum = Object.keys(screenBox)
    if (this.screenBoxNum.length) {
      this.maxScreenIndex = this.screenBoxNum[this.screenBoxNum.length - 1]
      this.loadManager(new LazyQueue(0))   // 初始加载首屏资源
    }
  }

  // 设置当前用户所处第几屏
  setCurrentViewScreenIndex(scrollY) {
    let screenHeight = this.screenHeight
    let screenIndex = Math.floor(scrollY / screenHeight)    // 若处在 n 和 n + 1 屏之间，选择 n 屏
    this.currentViewScreenIndex = screenIndex
    this.loadManager(new LazyQueue(screenIndex))
  }

  // 调整加载的屏序
  // 每load完一屏，就把该屏的序号从screeBoxNum中去除
  loadManager(screenIndexQueue) {
    let screenBoxNum = this.screenBoxNum
    let hasPreload = 0
    let loadIndex = screenIndexQueue.order
    let load = () => {
      if (screenIndexQueue.sign !== LazyQueue.newSign) {
        // 说明有新的加载队列，此时旧队列的后序队列不再提前加载
        return
      }
      if (hasPreload > M) {
        // 已经提前load完了当前访问的屏数的后maxPreload屏
        return
      }

      loadIndex = screenIndexQueue.order + hasPreload
      hasPreload++
      if (screenBoxNum.indexOf(loadIndex + '') > -1 && this.loading.indexOf(loadIndex) == -1) {
        // 还未加载过此屏
        this.loading.push(loadIndex)
        this.loadByScreen(loadIndex, load)
      } else {
        load()
      }
    }

    load()
  }

  // 分屏加载
  loadByScreen(screenIndex, cb) {
    let elements = this.screenBox[screenIndex]
    let elementsNum = elements.length
    let promises = elements.map((element) => {
      // 除了图片外，还可能是字体包等，写个loader
      return this[element.type + 'Loader'](element)
    })

    Promise.all(promises).then((data) => {
      this.loading.splice(this.loading.indexOf(screenIndex), 1)
      this.screenBoxNum.splice(this.screenBoxNum.indexOf(screenIndex + ''), 1)

      console.info(screenIndex + ' ok', this.screenBoxNum)
      typeof cb == 'function' && cb()
    })
  }
  // 加载图片
  imgLoader(element) {
    return new Promise((resolve, reject) => {
      let image = new Image()
      image.src = element.imgSrc
      image.onload = image.onerror = () => {
        // ....其他处理
        resolve()
      }
    })
  }
}

export default Lazyloader