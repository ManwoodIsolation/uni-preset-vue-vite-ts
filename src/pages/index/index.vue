<template>
  <view class="content p-4">
    <!-- 蓝牙控制区域 -->
    <view class="mb-6">
      <button 
        class="bg-blue-500 text-white p-2 rounded mr-2"
        @click="initBLE">
        初始化蓝牙
      </button>
      <button 
        class="bg-blue-500 text-white p-2 rounded mr-2"
        @click="startBluetoothDevicesDiscovery">
        开始搜索设备
      </button>
      <button 
        class="bg-green-500 text-white p-2 rounded"
        :disabled="!deviceId || isConnected"
        @click="createBLEConnection">
        {{ isConnected ? '已连接' : '连接设备' }}
      </button>
    </view>

    <!-- 设备列表 -->
    <view class="mb-6" v-if="devices.length">
      <text class="block mb-2 font-bold">可用设备：</text>
      <scroll-view class="h-40 border rounded p-2">
        <view 
          v-for="device in devices"
          :key="device.deviceId"
          class="p-2 border-b"
          @click="selectDevice(device)">
          <text class="font-medium">{{ device.name || '未知设备' }}</text>
          <text class="block text-gray-600 text-sm">信号强度: {{ device.RSSI }}dBm</text>
        </view>
      </scroll-view>
    </view>

    <!-- 数据接收框 -->
    <view class="bg-gray-100 p-4 rounded-lg shadow-md">
      <view class="flex justify-between mb-2">
        <text class="font-bold text-gray-800">实时数据：</text>
        <text class="text-sm" :class="isConnected ? 'text-green-500' : 'text-red-500'">
          {{ isConnected ? '已连接' : '未连接' }}
        </text>
      </view>
      <scroll-view 
        class="h-64 bg-white rounded p-3 font-mono text-sm"
        scroll-y>
        <text class="break-all">{{ receivedData }}</text>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app';

// 蓝牙相关状态
const devices = ref([])
const deviceId = ref('')
const isConnected = ref(false)
const receivedData = ref('')
const serviceId = ref('C4:24:08:13:14:7A') // 需要替换为你的设备服务 UUID
const characteristicId = ref('0000FFF0-0000-1000-8000-00805F9B34FB') // 需要替换为你的特征值 UUID

// 初始化蓝牙模块
const initBLE = () => {
  uni.openBluetoothAdapter({
    success: () => {
      console.log('蓝牙适配器初始化成功')
      // 检查蓝牙适配器状态
      uni.getBluetoothAdapterState({
        success: (res) => {
          if (!res.available) {
            uni.showToast({ title: '蓝牙不可用', icon: 'none' })
          }
        }
      })
    },
    fail: (err) => {
      console.error('蓝牙初始化失败:', err)
      uni.showToast({ title: '蓝牙初始化失败，请检查蓝牙是否开启', icon: 'none' })
    }
  })
}

// 开始搜索设备
const startBluetoothDevicesDiscovery = () => {
  uni.startBluetoothDevicesDiscovery({
    services: [serviceId.value],
    success: () => {
      console.log('开始搜索设备')
      listenDevices()
    },
    fail: (err) => {
      console.error('搜索失败:', err)
      uni.showToast({ title: '搜索失败', icon: 'none' })
    }
  })
}

// 监听发现新设备
const listenDevices = () => {
  uni.onBluetoothDeviceFound(({ devices: foundDevices }) => {
    // 过滤重复设备
    const newDevices = foundDevices.filter(newDevice => {
      return !devices.value.some(device => device.deviceId === newDevice.deviceId)
    })
    // 过滤设备名称
    const filteredDevices = newDevices.filter(device => 
      device.name && device.name.toLowerCase().includes('your-device-prefix')
    )
    devices.value = [...devices.value, ...filteredDevices]
  })
}

// 选择设备
const selectDevice = (device) => {
  deviceId.value = device.deviceId
}

// 建立连接
const createBLEConnection = async () => {
  if (!deviceId.value) {
    uni.showToast({ title: '请先选择设备', icon: 'none' })
    return
  }
  try {
    await uni.createBLEConnection({ deviceId: deviceId.value })
    console.log('连接成功')
    isConnected.value = true
    listenCharacteristic()
  } catch (err) {
    console.error('连接失败:', err)
    uni.showToast({ title: '连接失败', icon: 'none' })
  }
}

// 监听特征值变化
const listenCharacteristic = async () => {
  try {
    const services = await uni.getBLEDeviceServices({ deviceId: deviceId.value })
    const service = services.services.find(s => s.uuid === serviceId.value)
    if (!service) {
      console.error('未找到指定服务')
      return
    }
    const characteristics = await uni.getBLEDeviceCharacteristics({
      deviceId: deviceId.value,
      serviceId: service.uuid
    })
    const characteristic = characteristics.characteristics.find(c => c.uuid === characteristicId.value && c.properties.notify)
    if (!characteristic) {
      console.error('未找到可通知的特征值')
      return
    }
    // 启用通知
    await uni.notifyBLECharacteristicValueChange({
      deviceId: deviceId.value,
      serviceId: service.uuid,
      characteristicId: characteristic.uuid,
      state: true
    })
    // 监听数据接收
    uni.onBLECharacteristicValueChange(({ value }) => {
      receivedData.value += hex2string(value) + '\n'
    })
  } catch (err) {
    console.error('监听特征值失败:', err)
  }
}

// 十六进制转字符串
const hex2string = (buffer) => {
  const u8 = new Uint8Array(buffer)
  return Array.from(u8)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
}

// 断开连接
const closeBLEConnection = () => {
  if (deviceId.value) {
    uni.closeBLEConnection({ deviceId: deviceId.value })
    isConnected.value = false
    deviceId.value = ''
    console.log('连接已关闭')
  }
}

// 页面加载时初始化蓝牙
onLoad(()=>{
  initBLE()
})

// 页面卸载时清理
onUnload(() => {
  if (isConnected.value) closeBLEConnection()
  uni.stopBluetoothDevicesDiscovery()
});
</script>