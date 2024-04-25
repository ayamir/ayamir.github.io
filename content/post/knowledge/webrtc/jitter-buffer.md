---
title: "Jitter Buffer学习理解（上）"
date: 2024-04-18T17:33:24+08:00
draft: false
math: true
keywords: ["webrtc"]
tags: ["WebRTC"]
categories: ["knowledge"]
url: "posts/knowledge/webrtc/jitter-buffer"
summary: "这篇博客主要分析理解 WebRTC 中的 Jitter Buffer 的工作职责以及 Buffer 相关的代码实现。"
---

## Jitter Buffer 是什么

在了解 Jitter Buffer 之前，我们应该先来看一下整个 webrtc 会话中数据传输的完整流程。

![image-20240418175944047](https://raw.githubusercontent.com/ayamir/blog-imgs/main/image-20240418175944047.png)

与传输相关的部分主要出现在 pacer 和 Jitter Buffer 这两个部分，从图中可以清晰的看到这两者处于编解码和网络传输之间，考虑到编解码可能会引入突变的帧大小（比如 I 帧），而在网络传输的过程又受到网络传输速率和排队延迟的影响，所以它们的作用其实就比较显而易见了。Pacer 在发送端负责平滑编码后的码流打包成 rtp 包之后，发送到网络上的速率；Jitter Buffer 在接收端负责平滑接收到的 rtp 包到组成解码所需的码流的过程。

当然，这个传输的过程中离开不了拥塞控制算法如 gcc 和各种抗丢包的技术如 nack，fec 等来保障实时通信质量。在这里我们主要关注传输的流程，相关算法和机制之后再研究。

Jitter Buffer 可以理解为有两部分的功能，一部分是 Buffer 的功能，也就是作为 rtp 包的缓冲区，并且将 rtp 包恢复成表示可解码帧的码流；另一部分是 Jitter 的功能，也就是通过引入延迟来平滑因帧大小和网络状况而造成的接收帧不均匀的情况。

## buffer 的工作流程

正如前面所说，网络传输的是 rtp 包，而解码器的输入是可以解码的码流，所以需要一个将 rtp 包转换成可以解码的帧的过程。因为一个帧由多个 rtp 包组成，所以肯定需要缓冲区来存放前面收到但是还不足以组成一个帧的 rtp 包，这个缓冲区在 webrtc 中其实就是`PacketBuffer`。此外，考虑到编解码原理，接收到的 P 帧还需要等它所依赖的 I 帧/P 帧被解码，它才能被解码，所以在`PacketBuffer`之外还需要一个`FrameBuffer`来缓存可以解码的一个 GOP 中的各个帧。而负责寻找当前帧所依赖帧的是`RtpFrameReferenceFinder`，因为这个寻找依赖帧的过程实际上是递归依赖的，直到找到一个 GOP 的 IDR 帧才算结束，这样就能得到按照解码依赖顺序排列的一个 GOP。而最后，因为不同 GOP 的解码是独立的，所以 GOP 之间实际上就直接按照时间顺序排列就完成了 GOP 的排序。

总体上来看，buffer 负责的工作就是 3 个：rtp 包的排序并组成帧、帧的排序并组成 GOP、GOP 的排序并组成视频。

## 代码实现

结合代码逻辑来看一下实际的工作流程，最核心的类是`RtpVideoStreamReceiver2`，这个类负责完成上面所说的工作内容的实现与逻辑的拆分，不过除了上面这些逻辑之外，这个类还需要向发送端发送 rtcp 反馈包的工作，比如 nack, pli, fir。

```cpp
class RtpVideoStreamReceiver2 : public LossNotificationSender,
                                public RecoveredPacketReceiver,
                                public RtpPacketSinkInterface,
                                public KeyFrameRequestSender,
                                public NackSender,
                                public OnDecryptedFrameCallback,
                                public OnDecryptionStatusChangeCallback,
                                public RtpVideoFrameReceiver {
 public:
  // A complete frame is a frame which has received all its packets and all its
  // references are known.
  class OnCompleteFrameCallback {
   public:
    virtual ~OnCompleteFrameCallback() {}
    virtual void OnCompleteFrame(std::unique_ptr<EncodedFrame> frame) = 0;
  };

  RtpVideoStreamReceiver2(
      TaskQueueBase* current_queue,
      Clock* clock,
      Transport* transport,
      RtcpRttStats* rtt_stats,
      // The packet router is optional; if provided, the RtpRtcp module for this
      // stream is registered as a candidate for sending REMB and transport
      // feedback.
      PacketRouter* packet_router,
      const VideoReceiveStreamInterface::Config* config,
      ReceiveStatistics* rtp_receive_statistics,
      RtcpPacketTypeCounterObserver* rtcp_packet_type_counter_observer,
      RtcpCnameCallback* rtcp_cname_callback,
      NackPeriodicProcessor* nack_periodic_processor,
      // The KeyFrameRequestSender is optional; if not provided, key frame
      // requests are sent via the internal RtpRtcp module.
      OnCompleteFrameCallback* complete_frame_callback,
      rtc::scoped_refptr<FrameDecryptorInterface> frame_decryptor,
      rtc::scoped_refptr<FrameTransformerInterface> frame_transformer,
      const FieldTrialsView& field_trials,
      RtcEventLog* event_log);
  ~RtpVideoStreamReceiver2() override;

  void AddReceiveCodec(uint8_t payload_type,
                       VideoCodecType video_codec,
                       const webrtc::CodecParameterMap& codec_params,
                       bool raw_payload);

  // Clears state for all receive codecs added via `AddReceiveCodec`.
  void RemoveReceiveCodecs();

  void StartReceive();
  void StopReceive();

  // Produces the transport-related timestamps; current_delay_ms is left unset.
  absl::optional<Syncable::Info> GetSyncInfo() const;

  bool DeliverRtcp(const uint8_t* rtcp_packet, size_t rtcp_packet_length);

  void FrameContinuous(int64_t seq_num);

  void FrameDecoded(int64_t seq_num);

  void SignalNetworkState(NetworkState state);

  // Returns number of different frames seen.
  int GetUniqueFramesSeen() const {
    RTC_DCHECK_RUN_ON(&packet_sequence_checker_);
    return frame_counter_.GetUniqueSeen();
  }

  // Implements RtpPacketSinkInterface.
  void OnRtpPacket(const RtpPacketReceived& packet) override;

  // Public only for tests.
  // Returns true if the packet should be stashed and retried at a later stage.
  bool OnReceivedPayloadData(rtc::CopyOnWriteBuffer codec_payload,
                             const RtpPacketReceived& rtp_packet,
                             const RTPVideoHeader& video,
                             int times_nacked);

  // Implements RecoveredPacketReceiver.
  void OnRecoveredPacket(const RtpPacketReceived& packet) override;

  // Send an RTCP keyframe request.
  void RequestKeyFrame() override;

  // Implements NackSender.
  void SendNack(const std::vector<uint16_t>& sequence_numbers,
                bool buffering_allowed) override;

  // Implements LossNotificationSender.
  void SendLossNotification(uint16_t last_decoded_seq_num,
                            uint16_t last_received_seq_num,
                            bool decodability_flag,
                            bool buffering_allowed) override;

  // Returns true if a decryptor is attached and frames can be decrypted.
  // Updated by OnDecryptionStatusChangeCallback. Note this refers to Frame
  // Decryption not SRTP.
  bool IsDecryptable() const;

  // Implements OnDecryptedFrameCallback.
  void OnDecryptedFrame(std::unique_ptr<RtpFrameObject> frame) override;

  // Implements OnDecryptionStatusChangeCallback.
  void OnDecryptionStatusChange(
      FrameDecryptorInterface::Status status) override;

  // Optionally set a frame decryptor after a stream has started. This will not
  // reset the decoder state.
  void SetFrameDecryptor(
      rtc::scoped_refptr<FrameDecryptorInterface> frame_decryptor);

  // Sets a frame transformer after a stream has started, if no transformer
  // has previously been set. Does not reset the decoder state.
  void SetDepacketizerToDecoderFrameTransformer(
      rtc::scoped_refptr<FrameTransformerInterface> frame_transformer);

  // Called by VideoReceiveStreamInterface when stats are updated.
  void UpdateRtt(int64_t max_rtt_ms);

  // Called when the local_ssrc is changed to match with a sender.
  void OnLocalSsrcChange(uint32_t local_ssrc);

  // Forwards the call to set rtcp_sender_ to the RTCP mode of the rtcp sender.
  void SetRtcpMode(RtcpMode mode);

  void SetReferenceTimeReport(bool enabled);

  // Sets or clears the callback sink that gets called for RTP packets. Used for
  // packet handlers such as FlexFec. Must be called on the packet delivery
  // thread (same context as `OnRtpPacket` is called on).
  // TODO(bugs.webrtc.org/11993): Packet delivery thread today means `worker
  // thread` but will be `network thread`.
  void SetPacketSink(RtpPacketSinkInterface* packet_sink);

  // Turns on/off loss notifications. Must be called on the packet delivery
  // thread.
  void SetLossNotificationEnabled(bool enabled);

  void SetNackHistory(TimeDelta history);

  int ulpfec_payload_type() const;
  int red_payload_type() const;
  void SetProtectionPayloadTypes(int red_payload_type, int ulpfec_payload_type);

  absl::optional<int64_t> LastReceivedPacketMs() const;
  absl::optional<uint32_t> LastReceivedFrameRtpTimestamp() const;
  absl::optional<int64_t> LastReceivedKeyframePacketMs() const;

  absl::optional<RtpRtcpInterface::SenderReportStats> GetSenderReportStats()
      const;

 private:
  // Implements RtpVideoFrameReceiver.
  void ManageFrame(std::unique_ptr<RtpFrameObject> frame) override;

  void OnCompleteFrames(RtpFrameReferenceFinder::ReturnVector frame)
      RTC_RUN_ON(packet_sequence_checker_);

  // Used for buffering RTCP feedback messages and sending them all together.
  // Note:
  // 1. Key frame requests and NACKs are mutually exclusive, with the
  //    former taking precedence over the latter.
  // 2. Loss notifications are orthogonal to either. (That is, may be sent
  //    alongside either.)
  class RtcpFeedbackBuffer : public KeyFrameRequestSender,
                             public NackSender,
                             public LossNotificationSender {
   public:
    RtcpFeedbackBuffer(KeyFrameRequestSender* key_frame_request_sender,
                       NackSender* nack_sender,
                       LossNotificationSender* loss_notification_sender);

    ~RtcpFeedbackBuffer() override = default;

    // KeyFrameRequestSender implementation.
    void RequestKeyFrame() override;

    // NackSender implementation.
    void SendNack(const std::vector<uint16_t>& sequence_numbers,
                  bool buffering_allowed) override;

    // LossNotificationSender implementation.
    void SendLossNotification(uint16_t last_decoded_seq_num,
                              uint16_t last_received_seq_num,
                              bool decodability_flag,
                              bool buffering_allowed) override;

    // Send all RTCP feedback messages buffered thus far.
    void SendBufferedRtcpFeedback();

    void ClearLossNotificationState();

   private:
    // LNTF-related state.
    struct LossNotificationState {
      LossNotificationState(uint16_t last_decoded_seq_num,
                            uint16_t last_received_seq_num,
                            bool decodability_flag)
          : last_decoded_seq_num(last_decoded_seq_num),
            last_received_seq_num(last_received_seq_num),
            decodability_flag(decodability_flag) {}

      uint16_t last_decoded_seq_num;
      uint16_t last_received_seq_num;
      bool decodability_flag;
    };

    RTC_NO_UNIQUE_ADDRESS SequenceChecker packet_sequence_checker_;
    KeyFrameRequestSender* const key_frame_request_sender_;
    NackSender* const nack_sender_;
    LossNotificationSender* const loss_notification_sender_;

    // Key-frame-request-related state.
    bool request_key_frame_ RTC_GUARDED_BY(packet_sequence_checker_);

    // NACK-related state.
    std::vector<uint16_t> nack_sequence_numbers_
        RTC_GUARDED_BY(packet_sequence_checker_);

    absl::optional<LossNotificationState> lntf_state_
        RTC_GUARDED_BY(packet_sequence_checker_);
  };
  enum ParseGenericDependenciesResult {
    kStashPacket,
    kDropPacket,
    kHasGenericDescriptor,
    kNoGenericDescriptor
  };

  // Entry point doing non-stats work for a received packet. Called
  // for the same packet both before and after RED decapsulation.
  void ReceivePacket(const RtpPacketReceived& packet)
      RTC_RUN_ON(packet_sequence_checker_);

  // Parses and handles RED headers.
  // This function assumes that it's being called from only one thread.
  void ParseAndHandleEncapsulatingHeader(const RtpPacketReceived& packet)
      RTC_RUN_ON(packet_sequence_checker_);
  void NotifyReceiverOfEmptyPacket(uint16_t seq_num)
      RTC_RUN_ON(packet_sequence_checker_);
  bool IsRedEnabled() const;
  void InsertSpsPpsIntoTracker(uint8_t payload_type)
      RTC_RUN_ON(packet_sequence_checker_);
  void OnInsertedPacket(video_coding::PacketBuffer::InsertResult result)
      RTC_RUN_ON(packet_sequence_checker_);
  ParseGenericDependenciesResult ParseGenericDependenciesExtension(
      const RtpPacketReceived& rtp_packet,
      RTPVideoHeader* video_header) RTC_RUN_ON(packet_sequence_checker_);
  void OnAssembledFrame(std::unique_ptr<RtpFrameObject> frame)
      RTC_RUN_ON(packet_sequence_checker_);
  void UpdatePacketReceiveTimestamps(const RtpPacketReceived& packet,
                                     bool is_keyframe)
      RTC_RUN_ON(packet_sequence_checker_);

  const FieldTrialsView& field_trials_;
  TaskQueueBase* const worker_queue_;
  Clock* const clock_;
  // Ownership of this object lies with VideoReceiveStreamInterface, which owns
  // `this`.
  const VideoReceiveStreamInterface::Config& config_;
  PacketRouter* const packet_router_;

  RemoteNtpTimeEstimator ntp_estimator_;

  // Set by the field trial WebRTC-ForcePlayoutDelay to override any playout
  // delay that is specified in the received packets.
  FieldTrialOptional<int> forced_playout_delay_max_ms_;
  FieldTrialOptional<int> forced_playout_delay_min_ms_;
  ReceiveStatistics* const rtp_receive_statistics_;
  std::unique_ptr<UlpfecReceiver> ulpfec_receiver_
      RTC_GUARDED_BY(packet_sequence_checker_);
  int red_payload_type_ RTC_GUARDED_BY(packet_sequence_checker_);

  RTC_NO_UNIQUE_ADDRESS SequenceChecker worker_task_checker_;
  // TODO(bugs.webrtc.org/11993): This checker conceptually represents
  // operations that belong to the network thread. The Call class is currently
  // moving towards handling network packets on the network thread and while
  // that work is ongoing, this checker may in practice represent the worker
  // thread, but still serves as a mechanism of grouping together concepts
  // that belong to the network thread. Once the packets are fully delivered
  // on the network thread, this comment will be deleted.
  RTC_NO_UNIQUE_ADDRESS SequenceChecker packet_sequence_checker_;
  RtpPacketSinkInterface* packet_sink_ RTC_GUARDED_BY(packet_sequence_checker_);
  bool receiving_ RTC_GUARDED_BY(packet_sequence_checker_);
  int64_t last_packet_log_ms_ RTC_GUARDED_BY(packet_sequence_checker_);

  const std::unique_ptr<ModuleRtpRtcpImpl2> rtp_rtcp_;

  NackPeriodicProcessor* const nack_periodic_processor_;
  OnCompleteFrameCallback* complete_frame_callback_;
  const KeyFrameReqMethod keyframe_request_method_;

  RtcpFeedbackBuffer rtcp_feedback_buffer_;
  // TODO(tommi): Consider absl::optional<NackRequester> instead of unique_ptr
  // since nack is usually configured.
  std::unique_ptr<NackRequester> nack_module_
      RTC_GUARDED_BY(packet_sequence_checker_);
  std::unique_ptr<LossNotificationController> loss_notification_controller_
      RTC_GUARDED_BY(packet_sequence_checker_);

  video_coding::PacketBuffer packet_buffer_
      RTC_GUARDED_BY(packet_sequence_checker_);
  // h26x_packet_buffer_ is nullptr if codec list doens't contain H.264 or
  // H.265, or field trial WebRTC-Video-H26xPacketBuffer is not enabled.
  std::unique_ptr<H26xPacketBuffer> h26x_packet_buffer_
      RTC_GUARDED_BY(packet_sequence_checker_);
  UniqueTimestampCounter frame_counter_
      RTC_GUARDED_BY(packet_sequence_checker_);
  SeqNumUnwrapper<uint16_t> frame_id_unwrapper_
      RTC_GUARDED_BY(packet_sequence_checker_);

  // Video structure provided in the dependency descriptor in a first packet
  // of a key frame. It is required to parse dependency descriptor in the
  // following delta packets.
  std::unique_ptr<FrameDependencyStructure> video_structure_
      RTC_GUARDED_BY(packet_sequence_checker_);
  // Frame id of the last frame with the attached video structure.
  // absl::nullopt when `video_structure_ == nullptr`;
  absl::optional<int64_t> video_structure_frame_id_
      RTC_GUARDED_BY(packet_sequence_checker_);
  Timestamp last_logged_failed_to_parse_dd_
      RTC_GUARDED_BY(packet_sequence_checker_) = Timestamp::MinusInfinity();

  std::unique_ptr<RtpFrameReferenceFinder> reference_finder_
      RTC_GUARDED_BY(packet_sequence_checker_);
  absl::optional<VideoCodecType> current_codec_
      RTC_GUARDED_BY(packet_sequence_checker_);
  uint32_t last_assembled_frame_rtp_timestamp_
      RTC_GUARDED_BY(packet_sequence_checker_);

  std::map<int64_t, uint16_t> last_seq_num_for_pic_id_
      RTC_GUARDED_BY(packet_sequence_checker_);
  video_coding::H264SpsPpsTracker tracker_
      RTC_GUARDED_BY(packet_sequence_checker_);

  // Maps payload id to the depacketizer.
  std::map<uint8_t, std::unique_ptr<VideoRtpDepacketizer>> payload_type_map_
      RTC_GUARDED_BY(packet_sequence_checker_);

  // TODO(johan): Remove pt_codec_params_ once
  // https://bugs.chromium.org/p/webrtc/issues/detail?id=6883 is resolved.
  // Maps a payload type to a map of out-of-band supplied codec parameters.
  std::map<uint8_t, webrtc::CodecParameterMap> pt_codec_params_
      RTC_GUARDED_BY(packet_sequence_checker_);
  int16_t last_payload_type_ RTC_GUARDED_BY(packet_sequence_checker_) = -1;

  bool has_received_frame_ RTC_GUARDED_BY(packet_sequence_checker_);

  absl::optional<uint32_t> last_received_rtp_timestamp_
      RTC_GUARDED_BY(packet_sequence_checker_);
  absl::optional<uint32_t> last_received_keyframe_rtp_timestamp_
      RTC_GUARDED_BY(packet_sequence_checker_);
  absl::optional<Timestamp> last_received_rtp_system_time_
      RTC_GUARDED_BY(packet_sequence_checker_);
  absl::optional<Timestamp> last_received_keyframe_rtp_system_time_
      RTC_GUARDED_BY(packet_sequence_checker_);

  // Handles incoming encrypted frames and forwards them to the
  // rtp_reference_finder if they are decryptable.
  std::unique_ptr<BufferedFrameDecryptor> buffered_frame_decryptor_
      RTC_PT_GUARDED_BY(packet_sequence_checker_);
  bool frames_decryptable_ RTC_GUARDED_BY(worker_task_checker_);
  absl::optional<ColorSpace> last_color_space_;

  AbsoluteCaptureTimeInterpolator absolute_capture_time_interpolator_
      RTC_GUARDED_BY(packet_sequence_checker_);

  CaptureClockOffsetUpdater capture_clock_offset_updater_
      RTC_GUARDED_BY(packet_sequence_checker_);

  int64_t last_completed_picture_id_ = 0;

  rtc::scoped_refptr<RtpVideoStreamReceiverFrameTransformerDelegate>
      frame_transformer_delegate_;

  SeqNumUnwrapper<uint16_t> rtp_seq_num_unwrapper_
      RTC_GUARDED_BY(packet_sequence_checker_);
  std::map<int64_t, RtpPacketInfo> packet_infos_
      RTC_GUARDED_BY(packet_sequence_checker_);
  std::vector<RtpPacketReceived> stashed_packets_
      RTC_GUARDED_BY(packet_sequence_checker_);

  Timestamp next_keyframe_request_for_missing_video_structure_ =
      Timestamp::MinusInfinity();
  bool sps_pps_idr_is_h264_keyframe_ = false;
};
```

其中的`OnRtpPacket`方法实现了`RtpPacketSinkInterface`这一接口，负责完成前面提到的 buffer 的第一个工作内容：接收 rtp 包。

```cpp
// This method handles both regular RTP packets and packets recovered
// via FlexFEC.
void RtpVideoStreamReceiver2::OnRtpPacket(const RtpPacketReceived& packet) {
  RTC_DCHECK_RUN_ON(&packet_sequence_checker_);

  if (!receiving_)
    return;

  ReceivePacket(packet);

  // Update receive statistics after ReceivePacket.
  // Receive statistics will be reset if the payload type changes (make sure
  // that the first packet is included in the stats).
  if (!packet.recovered()) {
    rtp_receive_statistics_->OnRtpPacket(packet);
  }

  if (packet_sink_) {
    packet_sink_->OnRtpPacket(packet);
  }
}
```

其中，用于接收普通 rtp 包的方法为`ReceivePacket`：

```cpp
void RtpVideoStreamReceiver2::ReceivePacket(const RtpPacketReceived& packet) {
  RTC_DCHECK_RUN_ON(&packet_sequence_checker_);

  if (packet.payload_size() == 0) {
    // Padding or keep-alive packet.
    // TODO(nisse): Could drop empty packets earlier, but need to figure out how
    // they should be counted in stats.
    NotifyReceiverOfEmptyPacket(packet.SequenceNumber());
    return;
  }
  if (packet.PayloadType() == red_payload_type_) {
    ParseAndHandleEncapsulatingHeader(packet);
    return;
  }

  const auto type_it = payload_type_map_.find(packet.PayloadType());
  if (type_it == payload_type_map_.end()) {
    return;
  }

  auto parse_and_insert = [&](const RtpPacketReceived& packet) {
    RTC_DCHECK_RUN_ON(&packet_sequence_checker_);
    absl::optional<VideoRtpDepacketizer::ParsedRtpPayload> parsed_payload =
        type_it->second->Parse(packet.PayloadBuffer());
    if (parsed_payload == absl::nullopt) {
      RTC_LOG(LS_WARNING) << "Failed parsing payload.";
      return false;
    }

    int times_nacked = nack_module_
                           ? nack_module_->OnReceivedPacket(
                                 packet.SequenceNumber(), packet.recovered())
                           : -1;

    return OnReceivedPayloadData(std::move(parsed_payload->video_payload),
                                 packet, parsed_payload->video_header,
                                 times_nacked);
  };

  // When the dependency descriptor is used and the descriptor fail to parse
  // then `OnReceivedPayloadData` may return true to signal the the packet
  // should be retried at a later stage, which is why they are stashed here.
  //
  // TODO(bugs.webrtc.org/15782):
  // This is an ugly solution. The way things should work is for the
  // `RtpFrameReferenceFinder` to stash assembled frames until the keyframe with
  // the relevant template structure has been received, but unfortunately the
  // `frame_transformer_delegate_` is called before the frames are inserted into
  // the `RtpFrameReferenceFinder`, and it expects the dependency descriptor to
  // be parsed at that stage.
  if (parse_and_insert(packet)) {
    if (stashed_packets_.size() == 100) {
      stashed_packets_.clear();
    }
    stashed_packets_.push_back(packet);
  } else {
    for (auto it = stashed_packets_.begin(); it != stashed_packets_.end();) {
      if (parse_and_insert(*it)) {
        ++it;  // keep in the stash.
      } else {
        it = stashed_packets_.erase(it);
      }
    }
  }
}
```

在`parse_and_insert()`中，首先将 packet 的`PayloadBuffer`移动到`parsed_payload`中，并且计算发送的 nack 的数量，然后将`parsed_payload`和`times_nacked`传入`OnReceivedPayloadData`来完成真正的 packet 解析和 frame 组装的工作。在下面`parse_and_insert`的使用过程，其实就是利用一个大小为 100 的 vector 来完成递归解析和组装属于同一个 frame 的 packet 的过程。这里的`OnReceivedPayloadData`的返回值表示的就是当前 packet 所属的帧有没有被解析完。

```cpp
bool RtpVideoStreamReceiver2::OnReceivedPayloadData(
    rtc::CopyOnWriteBuffer codec_payload,
    const RtpPacketReceived& rtp_packet,
    const RTPVideoHeader& video,
    int times_nacked) {
  RTC_DCHECK_RUN_ON(&packet_sequence_checker_);

  auto packet =
      std::make_unique<video_coding::PacketBuffer::Packet>(rtp_packet, video);

  int64_t unwrapped_rtp_seq_num =
      rtp_seq_num_unwrapper_.Unwrap(rtp_packet.SequenceNumber());

  RtpPacketInfo& packet_info =
      packet_infos_
          .emplace(unwrapped_rtp_seq_num,
                   RtpPacketInfo(rtp_packet.Ssrc(), rtp_packet.Csrcs(),
                                 rtp_packet.Timestamp(),
                                 /*receive_time_ms=*/clock_->CurrentTime()))
          .first->second;

  // Try to extrapolate absolute capture time if it is missing.
  packet_info.set_absolute_capture_time(
      absolute_capture_time_interpolator_.OnReceivePacket(
          AbsoluteCaptureTimeInterpolator::GetSource(packet_info.ssrc(),
                                                     packet_info.csrcs()),
          packet_info.rtp_timestamp(),
          // Assume frequency is the same one for all video frames.
          kVideoPayloadTypeFrequency,
          rtp_packet.GetExtension<AbsoluteCaptureTimeExtension>()));
  if (packet_info.absolute_capture_time().has_value()) {
    packet_info.set_local_capture_clock_offset(
        capture_clock_offset_updater_.ConvertsToTimeDela(
            capture_clock_offset_updater_.AdjustEstimatedCaptureClockOffset(
                packet_info.absolute_capture_time()
                    ->estimated_capture_clock_offset)));
  }
  RTPVideoHeader& video_header = packet->video_header;
  video_header.rotation = kVideoRotation_0;
  video_header.content_type = VideoContentType::UNSPECIFIED;
  video_header.video_timing.flags = VideoSendTiming::kInvalid;
  video_header.is_last_packet_in_frame |= rtp_packet.Marker();

  rtp_packet.GetExtension<VideoOrientation>(&video_header.rotation);
  rtp_packet.GetExtension<VideoContentTypeExtension>(
      &video_header.content_type);
  rtp_packet.GetExtension<VideoTimingExtension>(&video_header.video_timing);
  if (forced_playout_delay_max_ms_ && forced_playout_delay_min_ms_) {
    if (!video_header.playout_delay.emplace().Set(
            TimeDelta::Millis(*forced_playout_delay_min_ms_),
            TimeDelta::Millis(*forced_playout_delay_max_ms_))) {
      video_header.playout_delay = absl::nullopt;
    }
  } else {
    video_header.playout_delay = rtp_packet.GetExtension<PlayoutDelayLimits>();
  }

  if (!rtp_packet.recovered()) {
    UpdatePacketReceiveTimestamps(
        rtp_packet, video_header.frame_type == VideoFrameType::kVideoFrameKey);
  }

  ParseGenericDependenciesResult generic_descriptor_state =
      ParseGenericDependenciesExtension(rtp_packet, &video_header);

  if (generic_descriptor_state == kStashPacket) {
    return true;
  } else if (generic_descriptor_state == kDropPacket) {
    Timestamp now = clock_->CurrentTime();
    if (now - last_logged_failed_to_parse_dd_ > TimeDelta::Seconds(1)) {
      last_logged_failed_to_parse_dd_ = now;
      RTC_LOG(LS_WARNING) << "ssrc: " << rtp_packet.Ssrc()
                          << " Failed to parse dependency descriptor.";
    }
    if (video_structure_ == nullptr &&
        next_keyframe_request_for_missing_video_structure_ < now) {
      // No video structure received yet, most likely part of the initial
      // keyframe was lost.
      RequestKeyFrame();
      next_keyframe_request_for_missing_video_structure_ =
          now + TimeDelta::Seconds(1);
    }
    return false;
  }

  // Color space should only be transmitted in the last packet of a frame,
  // therefore, neglect it otherwise so that last_color_space_ is not reset by
  // mistake.
  if (video_header.is_last_packet_in_frame) {
    video_header.color_space = rtp_packet.GetExtension<ColorSpaceExtension>();
    if (video_header.color_space ||
        video_header.frame_type == VideoFrameType::kVideoFrameKey) {
      // Store color space since it's only transmitted when changed or for key
      // frames. Color space will be cleared if a key frame is transmitted
      // without color space information.
      last_color_space_ = video_header.color_space;
    } else if (last_color_space_) {
      video_header.color_space = last_color_space_;
    }
  }
  video_header.video_frame_tracking_id =
      rtp_packet.GetExtension<VideoFrameTrackingIdExtension>();

  if (loss_notification_controller_) {
    if (rtp_packet.recovered()) {
      // TODO(bugs.webrtc.org/10336): Implement support for reordering.
      RTC_LOG(LS_INFO)
          << "LossNotificationController does not support reordering.";
    } else if (generic_descriptor_state == kNoGenericDescriptor) {
      RTC_LOG(LS_WARNING) << "LossNotificationController requires generic "
                             "frame descriptor, but it is missing.";
    } else {
      if (video_header.is_first_packet_in_frame) {
        RTC_DCHECK(video_header.generic);
        LossNotificationController::FrameDetails frame;
        frame.is_keyframe =
            video_header.frame_type == VideoFrameType::kVideoFrameKey;
        frame.frame_id = video_header.generic->frame_id;
        frame.frame_dependencies = video_header.generic->dependencies;
        loss_notification_controller_->OnReceivedPacket(
            rtp_packet.SequenceNumber(), &frame);
      } else {
        loss_notification_controller_->OnReceivedPacket(
            rtp_packet.SequenceNumber(), nullptr);
      }
    }
  }

  packet->times_nacked = times_nacked;

  if (codec_payload.size() == 0) {
    NotifyReceiverOfEmptyPacket(packet->seq_num);
    rtcp_feedback_buffer_.SendBufferedRtcpFeedback();
    return false;
  }

  if (packet->codec() == kVideoCodecH264) {
    // Only when we start to receive packets will we know what payload type
    // that will be used. When we know the payload type insert the correct
    // sps/pps into the tracker.
    if (packet->payload_type != last_payload_type_) {
      last_payload_type_ = packet->payload_type;
      InsertSpsPpsIntoTracker(packet->payload_type);
    }
  }

  if (packet->codec() == kVideoCodecH264 && !h26x_packet_buffer_) {
    video_coding::H264SpsPpsTracker::FixedBitstream fixed =
        tracker_.CopyAndFixBitstream(
            rtc::MakeArrayView(codec_payload.cdata(), codec_payload.size()),
            &packet->video_header);

    switch (fixed.action) {
      case video_coding::H264SpsPpsTracker::kRequestKeyframe:
        rtcp_feedback_buffer_.RequestKeyFrame();
        rtcp_feedback_buffer_.SendBufferedRtcpFeedback();
        [[fallthrough]];
      case video_coding::H264SpsPpsTracker::kDrop:
        return false;
      case video_coding::H264SpsPpsTracker::kInsert:
        packet->video_payload = std::move(fixed.bitstream);
        break;
    }

  } else {
    packet->video_payload = std::move(codec_payload);
  }

  rtcp_feedback_buffer_.SendBufferedRtcpFeedback();
  frame_counter_.Add(packet->timestamp);

  if ((packet->codec() == kVideoCodecH264 ||
       packet->codec() == kVideoCodecH265) &&
      h26x_packet_buffer_) {
    OnInsertedPacket(h26x_packet_buffer_->InsertPacket(std::move(packet)));
  } else {
    OnInsertedPacket(packet_buffer_.InsertPacket(std::move(packet)));
  }
  return false;
}
```

这个方法的核心判断的逻辑在于利用`ParseGenericDependenciesExtension`来判断当前 packet 的依赖类型，对于正常的依赖类型`kHasGenericDescriptor`，调用`InsertPacket`将 packet 插入到`PacketBuffer`中，并将`InsertPacket`的返回值作为`OnInsertedPacket`的参数来组帧。

```cpp
PacketBuffer::InsertResult PacketBuffer::InsertPacket(
    std::unique_ptr<PacketBuffer::Packet> packet) {
  PacketBuffer::InsertResult result;

  uint16_t seq_num = packet->seq_num;
  size_t index = seq_num % buffer_.size();

  if (!first_packet_received_) {
    first_seq_num_ = seq_num;
    first_packet_received_ = true;
  } else if (AheadOf(first_seq_num_, seq_num)) {
    // If we have explicitly cleared past this packet then it's old,
    // don't insert it, just silently ignore it.
    if (is_cleared_to_first_seq_num_) {
      return result;
    }

    if (ForwardDiff<uint16_t>(first_seq_num_, seq_num) >= max_size_) {
      // Large negative jump in rtp sequence number: clear the buffer and treat
      // latest packet as the new first packet.
      Clear();
      first_packet_received_ = true;
    }

    first_seq_num_ = seq_num;
  }

  if (buffer_[index] != nullptr) {
    // Duplicate packet, just delete the payload.
    if (buffer_[index]->seq_num == packet->seq_num) {
      return result;
    }

    // The packet buffer is full, try to expand the buffer.
    while (ExpandBufferSize() && buffer_[seq_num % buffer_.size()] != nullptr) {
    }
    index = seq_num % buffer_.size();

    // Packet buffer is still full since we were unable to expand the buffer.
    if (buffer_[index] != nullptr) {
      // Clear the buffer, delete payload, and return false to signal that a
      // new keyframe is needed.
      RTC_LOG(LS_WARNING) << "Clear PacketBuffer and request key frame.";
      ClearInternal();
      result.buffer_cleared = true;
      return result;
    }
  }

  packet->continuous = false;
  buffer_[index] = std::move(packet);

  UpdateMissingPackets(seq_num);

  received_padding_.erase(
      received_padding_.begin(),
      received_padding_.lower_bound(seq_num - (buffer_.size() / 4)));

  result.packets = FindFrames(seq_num);
  return result;
}
```

`InsertPacket`的过程其实就是：首先判断是不是当前 packet 首包，是的话就记录一下，接下来的包开始往后排序，不是的话就调用包序列号比较函数 AheadOf。在利用索引计算的包在缓存中的位置如果被占用并且序列号一样，就是重复包，丢掉。如果被占用但是序列号不相同，就说明缓存满了，需要扩容，重新计算包的索引值，扩容后还是满的就要情况缓存了。

```cpp
void PacketBuffer::UpdateMissingPackets(uint16_t seq_num) {
  if (!newest_inserted_seq_num_)
    newest_inserted_seq_num_ = seq_num;

  const int kMaxPaddingAge = 1000;
  if (AheadOf(seq_num, *newest_inserted_seq_num_)) {
    uint16_t old_seq_num = seq_num - kMaxPaddingAge;
    auto erase_to = missing_packets_.lower_bound(old_seq_num);
    missing_packets_.erase(missing_packets_.begin(), erase_to);

    // Guard against inserting a large amount of missing packets if there is a
    // jump in the sequence number.
    if (AheadOf(old_seq_num, *newest_inserted_seq_num_))
      *newest_inserted_seq_num_ = old_seq_num;

    ++*newest_inserted_seq_num_;
    while (AheadOf(seq_num, *newest_inserted_seq_num_)) {
      missing_packets_.insert(*newest_inserted_seq_num_);
      ++*newest_inserted_seq_num_;
    }
  } else {
    missing_packets_.erase(seq_num);
  }
}
```

这里的`UpdateMissingPackets`主要是利用`missing_packets_`来维护丢包缓存。

```cpp
std::vector<std::unique_ptr<PacketBuffer::Packet>> PacketBuffer::FindFrames(
    uint16_t seq_num) {
  std::vector<std::unique_ptr<PacketBuffer::Packet>> found_frames;
  auto start = seq_num;

  for (size_t i = 0; i < buffer_.size(); ++i) {
    if (received_padding_.find(seq_num) != received_padding_.end()) {
      seq_num += 1;
      continue;
    }

    if (!PotentialNewFrame(seq_num)) {
      break;
    }

    size_t index = seq_num % buffer_.size();
    buffer_[index]->continuous = true;

    // If all packets of the frame is continuous, find the first packet of the
    // frame and add all packets of the frame to the returned packets.
    if (buffer_[index]->is_last_packet_in_frame()) {
      uint16_t start_seq_num = seq_num;

      // Find the start index by searching backward until the packet with
      // the `frame_begin` flag is set.
      int start_index = index;
      size_t tested_packets = 0;
      int64_t frame_timestamp = buffer_[start_index]->timestamp;

      // Identify H.264 keyframes by means of SPS, PPS, and IDR.
      bool is_generic = buffer_[start_index]->video_header.generic.has_value();
      bool is_h264_descriptor =
          (buffer_[start_index]->codec() == kVideoCodecH264) && !is_generic;
      bool has_h264_sps = false;
      bool has_h264_pps = false;
      bool has_h264_idr = false;
      bool is_h264_keyframe = false;
      int idr_width = -1;
      int idr_height = -1;
      bool full_frame_found = false;
      while (true) {
        ++tested_packets;
		// 如果是VPX，并且找到了frame_begin标识的第一个包，一帧完整
        if (!is_h264_descriptor) {
          if (buffer_[start_index] == nullptr ||
              buffer_[start_index]->is_first_packet_in_frame()) {
            full_frame_found = buffer_[start_index] != nullptr;
            break;
          }
        }

        if (is_h264_descriptor) {
          const auto* h264_header = absl::get_if<RTPVideoHeaderH264>(
              &buffer_[start_index]->video_header.video_type_header);
          if (!h264_header || h264_header->nalus_length >= kMaxNalusPerPacket)
            return found_frames;

          for (size_t j = 0; j < h264_header->nalus_length; ++j) {
            if (h264_header->nalus[j].type == H264::NaluType::kSps) {
              has_h264_sps = true;
            } else if (h264_header->nalus[j].type == H264::NaluType::kPps) {
              has_h264_pps = true;
            } else if (h264_header->nalus[j].type == H264::NaluType::kIdr) {
              has_h264_idr = true;
            }
          }
          if ((sps_pps_idr_is_h264_keyframe_ && has_h264_idr && has_h264_sps &&
               has_h264_pps) ||
              (!sps_pps_idr_is_h264_keyframe_ && has_h264_idr)) {
            is_h264_keyframe = true;
            // Store the resolution of key frame which is the packet with
            // smallest index and valid resolution; typically its IDR or SPS
            // packet; there may be packet preceeding this packet, IDR's
            // resolution will be applied to them.
            if (buffer_[start_index]->width() > 0 &&
                buffer_[start_index]->height() > 0) {
              idr_width = buffer_[start_index]->width();
              idr_height = buffer_[start_index]->height();
            }
          }
        }

        if (tested_packets == buffer_.size())
          break;

        start_index = start_index > 0 ? start_index - 1 : buffer_.size() - 1;

        // In the case of H264 we don't have a frame_begin bit (yes,
        // `frame_begin` might be set to true but that is a lie). So instead
        // we traverese backwards as long as we have a previous packet and
        // the timestamp of that packet is the same as this one. This may cause
        // the PacketBuffer to hand out incomplete frames.
        // See: https://bugs.chromium.org/p/webrtc/issues/detail?id=7106
        if (is_h264_descriptor &&
            (buffer_[start_index] == nullptr ||
             buffer_[start_index]->timestamp != frame_timestamp)) {
          break;
        }

        --start_seq_num;
      }

      if (is_h264_descriptor) {
        // Warn if this is an unsafe frame.
        if (has_h264_idr && (!has_h264_sps || !has_h264_pps)) {
          RTC_LOG(LS_WARNING)
              << "Received H.264-IDR frame "
                 "(SPS: "
              << has_h264_sps << ", PPS: " << has_h264_pps << "). Treating as "
              << (sps_pps_idr_is_h264_keyframe_ ? "delta" : "key")
              << " frame since WebRTC-SpsPpsIdrIsH264Keyframe is "
              << (sps_pps_idr_is_h264_keyframe_ ? "enabled." : "disabled");
        }

        // Now that we have decided whether to treat this frame as a key frame
        // or delta frame in the frame buffer, we update the field that
        // determines if the RtpFrameObject is a key frame or delta frame.
        const size_t first_packet_index = start_seq_num % buffer_.size();
        if (is_h264_keyframe) {
          buffer_[first_packet_index]->video_header.frame_type =
              VideoFrameType::kVideoFrameKey;
          if (idr_width > 0 && idr_height > 0) {
            // IDR frame was finalized and we have the correct resolution for
            // IDR; update first packet to have same resolution as IDR.
            buffer_[first_packet_index]->video_header.width = idr_width;
            buffer_[first_packet_index]->video_header.height = idr_height;
          }
        } else {
          buffer_[first_packet_index]->video_header.frame_type =
              VideoFrameType::kVideoFrameDelta;
        }

        // If this is not a keyframe, make sure there are no gaps in the packet
        // sequence numbers up until this point.
        if (!is_h264_keyframe && missing_packets_.upper_bound(start_seq_num) !=
                                     missing_packets_.begin()) {
          return found_frames;
        }
      }

      if (is_h264_descriptor || full_frame_found) {
        const uint16_t end_seq_num = seq_num + 1;
        // Use uint16_t type to handle sequence number wrap around case.
        uint16_t num_packets = end_seq_num - start_seq_num;
        found_frames.reserve(found_frames.size() + num_packets);
        for (uint16_t i = start_seq_num; i != end_seq_num; ++i) {
          std::unique_ptr<Packet>& packet = buffer_[i % buffer_.size()];
          RTC_DCHECK(packet);
          RTC_DCHECK_EQ(i, packet->seq_num);
          // Ensure frame boundary flags are properly set.
          packet->video_header.is_first_packet_in_frame = (i == start_seq_num);
          packet->video_header.is_last_packet_in_frame = (i == seq_num);
          found_frames.push_back(std::move(packet));
        }

        missing_packets_.erase(missing_packets_.begin(),
                               missing_packets_.upper_bound(seq_num));
        received_padding_.erase(received_padding_.lower_bound(start),
                                received_padding_.upper_bound(seq_num));
      }
    }
    ++seq_num;
  }
  return found_frames;
}
```

`FindFrames`的主要工作是检测帧的完整性，具体的实现方式是遍历排序缓存中连续的包，来检查一帧的边界，并且对于 VPX 和 H264 的处理做了区分。对于 VPX，通过检测 frame_begin 和 frame_end 这两个包来确定收到了一个完整的帧，而对于 H264 则通过从 frame_end 标识的一帧最后一个包向前追溯，直到找到一个时间戳不一样的断层，认为找到了完整的一个 H264 的帧。

```cpp
void RtpVideoStreamReceiver2::OnInsertedPacket(
    video_coding::PacketBuffer::InsertResult result) {
  RTC_DCHECK_RUN_ON(&packet_sequence_checker_);
  RTC_DCHECK_RUN_ON(&worker_task_checker_);
  video_coding::PacketBuffer::Packet* first_packet = nullptr;
  int max_nack_count;
  int64_t min_recv_time;
  int64_t max_recv_time;
  std::vector<rtc::ArrayView<const uint8_t>> payloads;
  RtpPacketInfos::vector_type packet_infos;

  bool frame_boundary = true;
  for (auto& packet : result.packets) {
    // PacketBuffer promisses frame boundaries are correctly set on each
    // packet. Document that assumption with the DCHECKs.
    RTC_DCHECK_EQ(frame_boundary, packet->is_first_packet_in_frame());
    int64_t unwrapped_rtp_seq_num =
        rtp_seq_num_unwrapper_.Unwrap(packet->seq_num);
    RTC_DCHECK_GT(packet_infos_.count(unwrapped_rtp_seq_num), 0);
    RtpPacketInfo& packet_info = packet_infos_[unwrapped_rtp_seq_num];
    if (packet->is_first_packet_in_frame()) {
      first_packet = packet.get();
      max_nack_count = packet->times_nacked;
      min_recv_time = packet_info.receive_time().ms();
      max_recv_time = packet_info.receive_time().ms();
    } else {
      max_nack_count = std::max(max_nack_count, packet->times_nacked);
      min_recv_time = std::min(min_recv_time, packet_info.receive_time().ms());
      max_recv_time = std::max(max_recv_time, packet_info.receive_time().ms());
    }
    payloads.emplace_back(packet->video_payload);
    packet_infos.push_back(packet_info);

    frame_boundary = packet->is_last_packet_in_frame();
    if (packet->is_last_packet_in_frame()) {
      auto depacketizer_it = payload_type_map_.find(first_packet->payload_type);
      RTC_CHECK(depacketizer_it != payload_type_map_.end());
      RTC_CHECK(depacketizer_it->second);

      rtc::scoped_refptr<EncodedImageBuffer> bitstream =
          depacketizer_it->second->AssembleFrame(payloads);
      if (!bitstream) {
        // Failed to assemble a frame. Discard and continue.
        continue;
      }

      const video_coding::PacketBuffer::Packet& last_packet = *packet;
      OnAssembledFrame(std::make_unique<RtpFrameObject>(
          first_packet->seq_num,                             //
          last_packet.seq_num,                               //
          last_packet.marker_bit,                            //
          max_nack_count,                                    //
          min_recv_time,                                     //
          max_recv_time,                                     //
          first_packet->timestamp,                           //
          ntp_estimator_.Estimate(first_packet->timestamp),  //
          last_packet.video_header.video_timing,             //
          first_packet->payload_type,                        //
          first_packet->codec(),                             //
          last_packet.video_header.rotation,                 //
          last_packet.video_header.content_type,             //
          first_packet->video_header,                        //
          last_packet.video_header.color_space,              //
          RtpPacketInfos(std::move(packet_infos)),           //
          std::move(bitstream)));
      payloads.clear();
      packet_infos.clear();
    }
  }
  RTC_DCHECK(frame_boundary);
  if (result.buffer_cleared) {
    last_received_rtp_system_time_.reset();
    last_received_keyframe_rtp_system_time_.reset();
    last_received_keyframe_rtp_timestamp_.reset();
    packet_infos_.clear();
    RequestKeyFrame();
  }
}
```

在`OnInsertedPacket`中的主要逻辑就是缓存解析好的 packet，在遍历到当前帧的最后一个包之后调用`OnAssembledFrame`进行组帧。至此，rtp 包的排序和组帧的工作结束。

```cpp
void RtpVideoStreamReceiver2::OnAssembledFrame(
    std::unique_ptr<RtpFrameObject> frame) {
  RTC_DCHECK_RUN_ON(&packet_sequence_checker_);
  RTC_DCHECK(frame);

  const absl::optional<RTPVideoHeader::GenericDescriptorInfo>& descriptor =
      frame->GetRtpVideoHeader().generic;

  if (loss_notification_controller_ && descriptor) {
    loss_notification_controller_->OnAssembledFrame(
        frame->first_seq_num(), descriptor->frame_id,
        absl::c_linear_search(descriptor->decode_target_indications,
                              DecodeTargetIndication::kDiscardable),
        descriptor->dependencies);
  }

  // If frames arrive before a key frame, they would not be decodable.
  // In that case, request a key frame ASAP.
  if (!has_received_frame_) {
    if (frame->FrameType() != VideoFrameType::kVideoFrameKey) {
      // `loss_notification_controller_`, if present, would have already
      // requested a key frame when the first packet for the non-key frame
      // had arrived, so no need to replicate the request.
      if (!loss_notification_controller_) {
        RequestKeyFrame();
      }
    }
    has_received_frame_ = true;
  }

  // Reset `reference_finder_` if `frame` is new and the codec have changed.
  if (current_codec_) {
    bool frame_is_newer =
        AheadOf(frame->RtpTimestamp(), last_assembled_frame_rtp_timestamp_);

    if (frame->codec_type() != current_codec_) {
      if (frame_is_newer) {
        // When we reset the `reference_finder_` we don't want new picture ids
        // to overlap with old picture ids. To ensure that doesn't happen we
        // start from the `last_completed_picture_id_` and add an offset in case
        // of reordering.
        reference_finder_ = std::make_unique<RtpFrameReferenceFinder>(
            last_completed_picture_id_ + std::numeric_limits<uint16_t>::max());
        current_codec_ = frame->codec_type();
      } else {
        // Old frame from before the codec switch, discard it.
        return;
      }
    }

    if (frame_is_newer) {
      last_assembled_frame_rtp_timestamp_ = frame->RtpTimestamp();
    }
  } else {
    current_codec_ = frame->codec_type();
    last_assembled_frame_rtp_timestamp_ = frame->RtpTimestamp();
  }

  if (buffered_frame_decryptor_ != nullptr) {
    buffered_frame_decryptor_->ManageEncryptedFrame(std::move(frame));
  } else if (frame_transformer_delegate_) {
    frame_transformer_delegate_->TransformFrame(std::move(frame));
  } else {
    OnCompleteFrames(reference_finder_->ManageFrame(std::move(frame)));
  }
}
```

在`OnAssembledFrame`中则通过调用`RtpFrameReferenceFinder`的`ManageFrame`来寻找一个帧解码时所依赖的帧。

```cpp
RtpFrameReferenceFinder::ReturnVector RtpFrameReferenceFinder::ManageFrame(
    std::unique_ptr<RtpFrameObject> frame) {
  // If we have cleared past this frame, drop it.
  if (cleared_to_seq_num_ != -1 &&
      AheadOf<uint16_t>(cleared_to_seq_num_, frame->first_seq_num())) {
    return {};
  }

  auto frames = impl_->ManageFrame(std::move(frame));
  AddPictureIdOffset(frames);
  return frames;
}
```

这里的`impl_`是`RtpFrameReferenceFinder`代码逻辑的实现类的实例，其`ManageFrame`函数是寻找依赖帧的核心逻辑。

```cpp
RtpFrameReferenceFinder::ReturnVector RtpFrameReferenceFinderImpl::ManageFrame(
    std::unique_ptr<RtpFrameObject> frame) {
  const RTPVideoHeader& video_header = frame->GetRtpVideoHeader();

  if (video_header.generic.has_value()) {
    return GetRefFinderAs<RtpGenericFrameRefFinder>().ManageFrame(
        std::move(frame), *video_header.generic);
  }

  switch (frame->codec_type()) {
    case kVideoCodecVP8: {
      const RTPVideoHeaderVP8& vp8_header =
          absl::get<RTPVideoHeaderVP8>(video_header.video_type_header);

      if (vp8_header.temporalIdx == kNoTemporalIdx ||
          vp8_header.tl0PicIdx == kNoTl0PicIdx) {
        if (vp8_header.pictureId == kNoPictureId) {
          return GetRefFinderAs<RtpSeqNumOnlyRefFinder>().ManageFrame(
              std::move(frame));
        }

        return GetRefFinderAs<RtpFrameIdOnlyRefFinder>().ManageFrame(
            std::move(frame), vp8_header.pictureId);
      }

      return GetRefFinderAs<RtpVp8RefFinder>().ManageFrame(std::move(frame));
    }
    case kVideoCodecVP9: {
      const RTPVideoHeaderVP9& vp9_header =
          absl::get<RTPVideoHeaderVP9>(video_header.video_type_header);

      if (vp9_header.temporal_idx == kNoTemporalIdx) {
        if (vp9_header.picture_id == kNoPictureId) {
          return GetRefFinderAs<RtpSeqNumOnlyRefFinder>().ManageFrame(
              std::move(frame));
        }

        return GetRefFinderAs<RtpFrameIdOnlyRefFinder>().ManageFrame(
            std::move(frame), vp9_header.picture_id);
      }

      return GetRefFinderAs<RtpVp9RefFinder>().ManageFrame(std::move(frame));
    }
    case kVideoCodecGeneric: {
      if (auto* generic_header = absl::get_if<RTPVideoHeaderLegacyGeneric>(
              &video_header.video_type_header)) {
        return GetRefFinderAs<RtpFrameIdOnlyRefFinder>().ManageFrame(
            std::move(frame), generic_header->picture_id);
      }

      return GetRefFinderAs<RtpSeqNumOnlyRefFinder>().ManageFrame(
          std::move(frame));
    }
    default: {
      return GetRefFinderAs<RtpSeqNumOnlyRefFinder>().ManageFrame(
          std::move(frame));
    }
  }
}
```

在这个方法中主要是针对不同的编码类型做了分类处理，实际上完成寻找依赖帧工作的函数则交给了`RtpSeqNumOnlyRefFinder`的`ManageFrame`和`ManageFrameInternal`。

```cpp
RtpFrameReferenceFinder::ReturnVector RtpSeqNumOnlyRefFinder::ManageFrame(
    std::unique_ptr<RtpFrameObject> frame) {
  FrameDecision decision = ManageFrameInternal(frame.get());

  RtpFrameReferenceFinder::ReturnVector res;
  switch (decision) {
    case kStash:
      if (stashed_frames_.size() > kMaxStashedFrames)
        stashed_frames_.pop_back();
      stashed_frames_.push_front(std::move(frame));
      return res;
    case kHandOff:
      res.push_back(std::move(frame));
      RetryStashedFrames(res);
      return res;
    case kDrop:
      return res;
  }

  return res;
}

RtpSeqNumOnlyRefFinder::FrameDecision
RtpSeqNumOnlyRefFinder::ManageFrameInternal(RtpFrameObject* frame) {
  // 如果是关键帧，插入GOP表，key是last_seq_num，初始value是{last_seq_num,last_seq_num}
  if (frame->frame_type() == VideoFrameType::kVideoFrameKey) {
    last_seq_num_GOP_.insert(std::make_pair(
        frame->last_seq_num(),
        std::make_pair(frame->last_seq_num(), frame->last_seq_num())));
  }

  // We have received a frame but not yet a keyframe, stash this frame.
  // 如果GOP表空，那么就不可能找到参考帧，先缓存
  if (last_seq_num_GOP_.empty())
    return kStash;

  // Clean up info for old keyframes but make sure to keep info
  // for the last keyframe.
  // 删除较老的关键帧(PID小于last_seq_num - 100), 但是至少保留一个
  auto clean_to = last_seq_num_gop_.lower_bound(frame->last_seq_num() - 100);
  for (auto it = last_seq_num_gop_.begin();
       it != clean_to && last_seq_num_gop_.size() > 1;) {
    it = last_seq_num_gop_.erase(it);
  }

  // Find the last sequence number of the last frame for the keyframe
  // that this frame indirectly references.
  // 在GOP表中搜索第一个比当前帧新的关键帧
  auto seq_num_it = last_seq_num_gop_.upper_bound(frame->last_seq_num());
  // 如果搜索到的关键帧是最老的，说明当前帧比最老的关键帧还老，无法设置参考帧，丢弃
  if (seq_num_it == last_seq_num_gop_.begin()) {
    RTC_LOG(LS_WARNING) << "Generic frame with packet range ["
                        << frame->first_seq_num() << ", "
                        << frame->last_seq_num()
                        << "] has no GoP, dropping frame.";
    return kDrop;
  }
  // 如果搜索到的关键帧不是最老的，那么搜索到的关键帧的上一个关键帧所在的GOP里应该可以找到参考帧
  // 如果找不到关键帧，seq_num_it为end(), seq_num_it--则为最后一个关键帧
  seq_num_it--;

  // Make sure the packet sequence numbers are continuous, otherwise stash
  // this frame.
  // 保证帧的连续，不连续则先缓存
  // 当前GOP的最新一个帧的最后一个包的序列号
  uint16_t last_picture_id_gop = seq_num_it->second.first;
  // 当前GOP的最新包的序列号，可能是last_picture_id_gop, 也可能是填充包
  uint16_t last_picture_id_with_padding_gop = seq_num_it->second.second;
  // P帧的连续性检查
  if (frame->frame_type() == VideoFrameType::kVideoFrameDelta) {
    // 获得P帧第一个包的上个包的序列号
    uint16_t prev_seq_num = frame->first_seq_num() - 1;
	// 如果P帧第一个包的上个包的序列号与当前GOP的最新包的序列号不等，说明不连续，先缓存
    if (prev_seq_num != last_picture_id_with_padding_gop)
      return kStash;
  }
  // 现在这个帧是连续的了
  RTC_DCHECK(AheadOrAt(frame->last_seq_num(), seq_num_it->first));

  // Since keyframes can cause reordering we can't simply assign the
  // picture id according to some incrementing counter.
  // 获得当前帧的最后一个包的序列号，设置为初始PID，后面还会设置一次Unwrap
  frame->SetId(frame->last_seq_num());
  // 设置帧的参考帧数，P帧才需要1个参考帧
  frame->num_references =
      frame->frame_type() == VideoFrameType::kVideoFrameDelta;
  // 设置参考帧为当前GOP的最新一个帧的最后一个包的序列号
  // 既然该帧是连续的，那么其参考帧自然也就是上个帧
  frame->references[0] = rtp_seq_num_unwrapper_.Unwrap(last_picture_id_gop);
  // 如果当前帧比当前GOP的最新一个帧的最后一个包还新，则更新GOP的最新一个帧的最后一个包(first)
  // 以及GOP的最新包(second)
  if (AheadOf<uint16_t>(frame->Id(), last_picture_id_gop)) {
    seq_num_it->second.first = frame->Id();
    seq_num_it->second.second = frame->Id();
  }
  // 更新填充包状态
  UpdateLastPictureIdWithPadding(frame->Id());
  frame->SetSpatialIndex(0);
  // 设置当前帧的PID为Unwrap形式
  frame->SetId(rtp_seq_num_unwrapper_.Unwrap(frame->Id()));
  return kHandOff;
}

void RtpSeqNumOnlyRefFinder::RetryStashedFrames(
    RtpFrameReferenceFinder::ReturnVector& res) {
  bool complete_frame = false;
  do {
    complete_frame = false;
    for (auto frame_it = stashed_frames_.begin();
         frame_it != stashed_frames_.end();) {
      FrameDecision decision = ManageFrameInternal(frame_it->get());

      switch (decision) {
        case kStash:
          ++frame_it;
          break;
        case kHandOff:
          complete_frame = true;
          res.push_back(std::move(*frame_it));
          [[fallthrough]];
        case kDrop:
          frame_it = stashed_frames_.erase(frame_it);
      }
    }
  } while (complete_frame);
}
```

这里的`ManageFrameInternal`的核心逻辑实际上就是前面所说的，处理 GOP 内帧的连续性以及设置参考帧。至此就完成了 GOP 内的帧排序。

```cpp
void RtpVideoStreamReceiver2::OnCompleteFrames(
    RtpFrameReferenceFinder::ReturnVector frames) {
  RTC_DCHECK_RUN_ON(&packet_sequence_checker_);
  for (auto& frame : frames) {
    last_seq_num_for_pic_id_[frame->Id()] = frame->last_seq_num();

    last_completed_picture_id_ =
        std::max(last_completed_picture_id_, frame->Id());
    complete_frame_callback_->OnCompleteFrame(std::move(frame));
  }
}
```

而`OnCompleteFrames`则接受`MangeFrame`的返回值作为参数，遍历 GOP 中已经排好序的 Frame 调用`complete_frame_callback_`的`OnCompleteFrame`函数。

```cpp
void VideoReceiveStream2::OnCompleteFrame(std::unique_ptr<EncodedFrame> frame) {
  RTC_DCHECK_RUN_ON(&worker_sequence_checker_);

  if (absl::optional<VideoPlayoutDelay> playout_delay =
          frame->EncodedImage().PlayoutDelay()) {
    frame_minimum_playout_delay_ = playout_delay->min();
    frame_maximum_playout_delay_ = playout_delay->max();
    UpdatePlayoutDelays();
  }

  auto last_continuous_pid = buffer_->InsertFrame(std::move(frame));
  if (last_continuous_pid.has_value()) {
    {
      // TODO(bugs.webrtc.org/11993): Call on the network thread.
      RTC_DCHECK_RUN_ON(&packet_sequence_checker_);
      rtp_video_stream_receiver_.FrameContinuous(*last_continuous_pid);
    }
  }
```

这里先更新`playout_delay`用于之后 Jitter 的计算，然后将 frame 插入到`VideoStreamBufferController`中：

```cpp
absl::optional<int64_t> VideoStreamBufferController::InsertFrame(
    std::unique_ptr<EncodedFrame> frame) {
  RTC_DCHECK_RUN_ON(&worker_sequence_checker_);
  FrameMetadata metadata(*frame);
  int complete_units = buffer_->GetTotalNumberOfContinuousTemporalUnits();
  if (buffer_->InsertFrame(std::move(frame))) {
    RTC_DCHECK(metadata.receive_time) << "Frame receive time must be set!";
    if (!metadata.delayed_by_retransmission && metadata.receive_time &&
        (field_trials_.IsDisabled("WebRTC-IncomingTimestampOnMarkerBitOnly") ||
         metadata.is_last_spatial_layer)) {
      timing_->IncomingTimestamp(metadata.rtp_timestamp,
                                 *metadata.receive_time);
    }
    if (complete_units < buffer_->GetTotalNumberOfContinuousTemporalUnits()) {
      stats_proxy_->OnCompleteFrame(metadata.is_keyframe, metadata.size,
                                    metadata.contentType);
      MaybeScheduleFrameForRelease();
    }
  }

  return buffer_->LastContinuousFrameId();
}
```

这里的核心逻辑就是将 frame 插入到`FrameBuffer`中：

```cpp
bool FrameBuffer::InsertFrame(std::unique_ptr<EncodedFrame> frame) {
  if (!ValidReferences(*frame)) {
    RTC_DLOG(LS_WARNING) << "Frame " << frame->Id()
                         << " has invalid references, dropping frame.";
    return false;
  }
  // 根据frame的id判断是否解码过，解码过就不插入直接返回
  if (frame->Id() <= decoded_frame_history_.GetLastDecodedFrameId()) {
    if (legacy_frame_id_jump_behavior_ && frame->is_keyframe() &&
        AheadOf(frame->RtpTimestamp(),
                *decoded_frame_history_.GetLastDecodedFrameTimestamp())) {
      RTC_DLOG(LS_WARNING)
          << "Keyframe " << frame->Id()
          << " has newer timestamp but older picture id, clearing buffer.";
      Clear();
    } else {
      // Already decoded past this frame.
      return false;
    }
  }
  // 判断填满buffer的frame是不是I帧，是就清空buffer，否则不插入
  if (frames_.size() == max_size_) {
    if (frame->is_keyframe()) {
      RTC_DLOG(LS_WARNING) << "Keyframe " << frame->Id()
                           << " inserted into full buffer, clearing buffer.";
      Clear();
    } else {
      // No space for this frame.
      return false;
    }
  }
  // 插入当前帧到FrameBuffer中
  const int64_t frame_id = frame->Id();
  auto insert_res = frames_.emplace(frame_id, FrameInfo{std::move(frame)});
  if (!insert_res.second) {
    // Frame has already been inserted.
    return false;
  }

  if (frames_.size() == max_size_) {
    RTC_DLOG(LS_WARNING) << "Frame " << frame_id
                         << " inserted, buffer is now full.";
  }
  // 前向传播当前FrameBuffer中的解码连续性
  PropagateContinuity(insert_res.first);
  // 更新下一个可解码的时域单元的timestamp
  FindNextAndLastDecodableTemporalUnit();
  return true;
}
```

视频帧的`FrameBuffer`按照可解码的顺序建立完毕，之后就可以根据 Jitter Delay 来交付给解码器解码了。至此，Buffer 的功能分析完毕，下篇学习分析 Jitter Buffer 的核心算法，也就是 Jitter 的计算过程。
