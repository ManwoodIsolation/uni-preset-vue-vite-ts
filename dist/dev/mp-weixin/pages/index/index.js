"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const devices = common_vendor.ref([]);
    const deviceId = common_vendor.ref("");
    const isConnected = common_vendor.ref(false);
    const receivedData = common_vendor.ref("");
    const serviceId = common_vendor.ref("C4:24:08:13:14:7A");
    const characteristicId = common_vendor.ref("0000FFF0-0000-1000-8000-00805F9B34FB");
    const initBLE = () => {
      common_vendor.index.openBluetoothAdapter({
        success: () => {
          console.log("蓝牙适配器初始化成功");
          common_vendor.index.getBluetoothAdapterState({
            success: (res) => {
              if (!res.available) {
                common_vendor.index.showToast({ title: "蓝牙不可用", icon: "none" });
              }
            }
          });
        },
        fail: (err) => {
          console.error("蓝牙初始化失败:", err);
          common_vendor.index.showToast({ title: "蓝牙初始化失败，请检查蓝牙是否开启", icon: "none" });
        }
      });
    };
    const startBluetoothDevicesDiscovery = () => {
      common_vendor.index.startBluetoothDevicesDiscovery({
        services: [serviceId.value],
        success: () => {
          console.log("开始搜索设备");
          listenDevices();
        },
        fail: (err) => {
          console.error("搜索失败:", err);
          common_vendor.index.showToast({ title: "搜索失败", icon: "none" });
        }
      });
    };
    const listenDevices = () => {
      common_vendor.index.onBluetoothDeviceFound(({ devices: foundDevices }) => {
        const newDevices = foundDevices.filter((newDevice) => {
          return !devices.value.some((device) => device.deviceId === newDevice.deviceId);
        });
        const filteredDevices = newDevices.filter(
          (device) => device.name && device.name.toLowerCase().includes("your-device-prefix")
        );
        devices.value = [...devices.value, ...filteredDevices];
      });
    };
    const selectDevice = (device) => {
      deviceId.value = device.deviceId;
    };
    const createBLEConnection = async () => {
      if (!deviceId.value) {
        common_vendor.index.showToast({ title: "请先选择设备", icon: "none" });
        return;
      }
      try {
        await common_vendor.index.createBLEConnection({ deviceId: deviceId.value });
        console.log("连接成功");
        isConnected.value = true;
        listenCharacteristic();
      } catch (err) {
        console.error("连接失败:", err);
        common_vendor.index.showToast({ title: "连接失败", icon: "none" });
      }
    };
    const listenCharacteristic = async () => {
      try {
        const services = await common_vendor.index.getBLEDeviceServices({ deviceId: deviceId.value });
        const service = services.services.find((s) => s.uuid === serviceId.value);
        if (!service) {
          console.error("未找到指定服务");
          return;
        }
        const characteristics = await common_vendor.index.getBLEDeviceCharacteristics({
          deviceId: deviceId.value,
          serviceId: service.uuid
        });
        const characteristic = characteristics.characteristics.find((c) => c.uuid === characteristicId.value && c.properties.notify);
        if (!characteristic) {
          console.error("未找到可通知的特征值");
          return;
        }
        await common_vendor.index.notifyBLECharacteristicValueChange({
          deviceId: deviceId.value,
          serviceId: service.uuid,
          characteristicId: characteristic.uuid,
          state: true
        });
        common_vendor.index.onBLECharacteristicValueChange(({ value }) => {
          receivedData.value += hex2string(value) + "\n";
        });
      } catch (err) {
        console.error("监听特征值失败:", err);
      }
    };
    const hex2string = (buffer) => {
      const u8 = new Uint8Array(buffer);
      return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    };
    const closeBLEConnection = () => {
      if (deviceId.value) {
        common_vendor.index.closeBLEConnection({ deviceId: deviceId.value });
        isConnected.value = false;
        deviceId.value = "";
        console.log("连接已关闭");
      }
    };
    common_vendor.onLoad(() => {
      initBLE();
    });
    common_vendor.onUnload(() => {
      if (isConnected.value)
        closeBLEConnection();
      common_vendor.index.stopBluetoothDevicesDiscovery();
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(initBLE),
        b: common_vendor.o(startBluetoothDevicesDiscovery),
        c: common_vendor.t(isConnected.value ? "已连接" : "连接设备"),
        d: !deviceId.value || isConnected.value,
        e: common_vendor.o(createBLEConnection),
        f: devices.value.length
      }, devices.value.length ? {
        g: common_vendor.f(devices.value, (device, k0, i0) => {
          return {
            a: common_vendor.t(device.name || "未知设备"),
            b: common_vendor.t(device.RSSI),
            c: device.deviceId,
            d: common_vendor.o(($event) => selectDevice(device), device.deviceId)
          };
        })
      } : {}, {
        h: common_vendor.t(isConnected.value ? "已连接" : "未连接"),
        i: common_vendor.n(isConnected.value ? "text-green-500" : "text-red-500"),
        j: common_vendor.t(receivedData.value)
      });
    };
  }
};
wx.createPage(_sfc_main);
